# ISO 15118 Plug-and-Charge: Bridging the Gap Between Protocol and Product

*What happens when an EV identifies itself before your system is ready — and why the charging spec doesn't tell you how to handle it.*

---

## Introduction

ISO 15118 is one of the most exciting developments in EV charging. The premise is simple: you plug in your car, and the charger *knows who you are*. No app, no RFID card, no QR code. The vehicle identifies itself through a cryptographic handshake over the charging cable, and billing starts automatically.

This is called **Plug-and-Charge**, and it's the future of the charging experience. Tesla has had a proprietary version of this for years. ISO 15118 makes it an open standard.

At XChargeEV, we operate DC fast chargers in Ghana that support ISO 15118. When we first saw a vehicle's VIN appear in our server logs during a `StartTransaction` message, we thought we were ahead of the curve. Then we looked at the billing records: the car had charged for 7 minutes, consumed real energy, and we had *zero* record of it.

This is the story of what we found and what we built to fix it.

---

## How ISO 15118 Works (The 30-Second Version)

When a vehicle plugs into an ISO 15118-capable charger, a high-level communication layer activates over the charging cable's Control Pilot signal. The vehicle and charger negotiate:

1. **Identity** — The vehicle presents its VIN (Vehicle Identification Number) or a contract certificate
2. **Authorization** — The charger validates the identity against its local authorization list or the backend
3. **Charging parameters** — Voltage, current, target SoC, schedule
4. **Payment** — Billing is tied to the identified account

From the charger's perspective, this looks like a standard OCPP `StartTransaction` — except the `idTag` field contains a VIN instead of an RFID token or mobile app identifier.

That single difference broke three assumptions in our system.

---

## Assumption #1: Sessions Are Created Before StartTransaction

In our normal flow, a charging session follows a predictable sequence:

```
User opens mobile app → taps "Start Charging"
    ↓
Laravel API creates session record (status: pending)
API queues RemoteStartTransaction via OcppBridge
    ↓
Charger receives command → begins charging
Charger sends StartTransaction
    ↓
OCPP server matches StartTransaction to pending session
Session status → active
```

The critical invariant: **a session record exists in the database before `StartTransaction` arrives.**

With Plug-and-Charge, there is no app interaction. The vehicle initiates charging the moment it's plugged in. The charger sends `StartTransaction` immediately — and our server looks for a pending session that doesn't exist.

No session means no billing. No session means `MeterValues` are silently dropped. The car charges for free.

---

## Assumption #2: idTags Are RFID Tokens or App-Generated

Our authorization flow was designed around two types of `idTag`:

1. **App-generated tokens** — Created when the user taps "Start" in the mobile app, tied to their user account
2. **RFID tags** — Physical cards registered to a user, stored in an authorization table on the charger

A VIN is neither. It's a 17-character alphanumeric string that looks like `L1NNSGHB1RB018887`. Our `isRFIDAuthorized()` function actually passed it — the VIN was in the charger's local authorization list because our fleet VIN sync cron had put it there. But `getUserIdFromRFID()` returned `null` because the sync cron stored VINs without an associated `user_id`.

Authorization succeeded. User resolution failed. The charger was told "go ahead and charge" but the backend had no idea who to bill.

---

## Assumption #3: VIN Data Arrives After Session Creation

Even for chargers that report VINs alongside normal app-initiated sessions, we had a timing problem.

The ISO 15118 handshake happens at the physical layer, *before* any OCPP messages are exchanged. The charger knows the VIN before it sends `StartTransaction`. But the mobile app creates the session *after* the user taps start, which might be seconds or minutes after plugging in.

Our `attachVinToSession()` function searched for an active session to attach the VIN to. If the session didn't exist yet — which it often didn't — the VIN was lost.

---

## The Three Session-Creation Paths

After analyzing the problem, we realized our system had evolved to support three distinct ways a charging session could start:

### Path 1: Mobile App (Original)
```
App → API → OcppBridge → RemoteStartTransaction → Charger
```
User-initiated. Session exists before the charger starts. This is the happy path.

### Path 2: Fleet Auto-Start (Added Later)
```
Charger → DataTransfer (vehicleMAC) → Server matches fleet vehicle
→ Server creates session → RemoteStartTransaction → Charger
```
Vehicle-initiated via a proprietary MAC address message. The server identifies the fleet vehicle, creates a session, and tells the charger to start. Session exists before `StartTransaction`.

### Path 3: ISO 15118 Plug-and-Charge (The Gap)
```
Vehicle plugs in → ISO 15118 handshake → Charger sends StartTransaction (idTag = VIN)
→ Server receives StartTransaction → ??? → No session exists
```
Vehicle-initiated via the open standard. No prior communication. No pending session. **This path had no implementation.**

---

## Building the Solution

### Step 1: VIN-to-User Resolution

The first problem was mapping a VIN to a billable user. Our fleet management system already had this data:

```
Fleet Vehicle (VIN: L1NNSGHB1RB018887)
    → Assigned to Driver (custodian_id: 29)
    → Belongs to Fleet (fleet_id: 5)
    → Fleet has billing rules (corporate vs. individual)
```

The `SyncFleetVehicleVINs` cron already synced VINs to the charger's authorization table, but it didn't store the `user_id`. Fix: include the custodian's user ID when syncing, so `getUserIdFromRFID()` can resolve VINs to users.

### Step 2: The VIN Buffer

For the timing mismatch — VINs arriving before sessions — we introduced a **buffer table**. When a VIN arrives in `StartTransaction` and no matching session exists:

1. Store the VIN in `my_set_command_buffer` with a `pending_vin` flag
2. Associate it with the charger and connector

When a session is later matched (via `setTransactionIdForSession`), it checks the buffer:

1. Look for a `pending_vin` entry matching the charger + connector
2. Attach the VIN to the session
3. Clear the buffer entry

This decouples VIN capture from session timing. The VIN is never lost — it just waits for its session.

### Step 3: Auto-Session Creation

The most significant change: when `StartTransaction` arrives with a VIN as the `idTag` and no pending session exists, create one automatically.

```
StartTransaction (idTag = VIN) arrives
    ↓
No pending session found
    ↓
Is idTag a VIN? (length, format check)
    ↓ yes
Look up fleet vehicle by VIN
    ↓ found
Get custodian user_id, fleet_id, billing rules
    ↓
Create session (status: active, fleet_id, detected_vin)
    ↓
Continue normal flow (MeterValues → billing → StopTransaction)
```

This reuses the existing fleet billing infrastructure — driver limits, corporate vs. individual billing, session fee deduction — while adding a new entry point.

---

## The Edge Cases That Keep You Up at Night

### What if the VIN isn't in any fleet?

A personal vehicle with ISO 15118 support plugs into our charger. The VIN isn't registered to any fleet. We can't bill them.

**Current approach:** The charger's local authorization list only contains VINs we've explicitly synced. Unknown VINs get `Rejected` in the `Authorize` response, and the charger won't start. This is safe but not user-friendly — we're effectively blocking Plug-and-Charge for non-fleet vehicles until we build a VIN registration flow in the mobile app.

### What if the custodian has insufficient balance?

Fleet billing has two modes: corporate (fleet pays) and individual (driver pays). If the driver's wallet is empty, should we reject the charge? Block the car from starting?

**Current approach:** Check balance before creating the session, same as the mobile app flow. If insufficient, don't create the session — the `StartTransaction` response includes the transaction ID only if a session was created. Without it, the charger should stop.

### What if the same VIN is in multiple fleets?

Technically possible if a vehicle is transferred between fleets. Our lookup returns the most recent active assignment.

### What about non-fleet Plug-and-Charge?

The long-term vision is to let any user register their VIN in the mobile app and enable Plug-and-Charge for personal use. The infrastructure supports it — we just need a user-facing VIN registration flow and to decouple the VIN authorization from fleet-only logic.

---

## What the Spec Doesn't Tell You

ISO 15118 and OCPP 1.6 are both well-written specifications. But they describe *protocols*, not *systems*. The spec tells you that `StartTransaction` will contain an `idTag`. It doesn't tell you:

- That the `idTag` might be a VIN instead of an RFID token
- That your session matching assumes a session already exists
- That your VIN sync cron needs to include user identity, not just authorization
- That the timing of ISO 15118 handshakes conflicts with your app-driven session creation flow
- That you'll need a buffer mechanism to handle data arriving out of order

Every charging backend that implements Plug-and-Charge will face these same gaps. The protocol layer works. The *product* layer — billing, session tracking, fleet management — is where all the integration work lives.

---

## Lessons for Implementers

1. **Audit your session-creation assumptions.** List every path that leads to a `StartTransaction`. If any of them skip your session-creation step, you have a billing gap.

2. **Buffer everything you can't immediately associate.** VINs, MAC addresses, SoC readings — if the data arrives before the session exists, don't drop it. Store it and reconcile later.

3. **Make your idTag handling polymorphic.** An `idTag` might be a UUID from your app, a hex RFID code, a vehicle VIN, or something you haven't seen yet. Design your authorization pipeline to handle multiple formats.

4. **Test with real vehicles.** Simulators follow the spec. Real vehicles follow their manufacturer's firmware. The only way to find timing issues is to plug in a real car and watch the message sequence.

5. **Start with fleet vehicles.** They give you a controlled environment — you know the VIN, the driver, the billing rules. Build Plug-and-Charge for fleets first, then expand to personal vehicles once the flow is proven.

---

## Conclusion

Plug-and-Charge is the UX leap EV charging needs. No app, no card, no friction — just plug in and drive away. But implementing it means reconciling a real-time protocol handshake with an application layer that was designed around user-initiated flows.

The gap isn't in the protocol. It's in the assumptions your codebase makes about *who starts the session* and *when data arrives*. Close those gaps, and Plug-and-Charge becomes just another session-creation path — one that happens to feel like magic to the driver.

---

*Yaqoub — Software Engineer at XChargeEV*
*April 2026*
