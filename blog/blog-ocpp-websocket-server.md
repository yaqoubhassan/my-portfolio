# Building a Custom OCPP 1.6 WebSocket Server from Scratch — And the 9 Bugs That Nearly Broke It

*How we built an EV charging backend in PHP, and the cascade of subtle bugs we uncovered when real chargers met real drivers.*

---

## Introduction

When most people think of EV charging, they think of plugging in and walking away. Behind that simplicity is a protocol called **OCPP (Open Charge Point Protocol)** — the language chargers and backend systems use to communicate. It handles authorization, metering, billing, session tracking, and more, all over a persistent WebSocket connection.

At [XChargeEV](https://xchargeev.com), we operate a network of EV chargers across Ghana. Rather than buying an off-the-shelf OCPP backend, we built ours from the ground up — a custom WebSocket server in PHP, integrated with a Laravel backend and a Vue.js mobile app. This gave us full control over session logic, billing, fleet management, and the ability to move fast when operators reported issues.

This article covers how our OCPP server is architected, and more importantly, the story of a single debugging session that uncovered **nine interconnected bugs** — bugs that were silently losing revenue, killing active sessions, and double-charging users.

---

## The Architecture

### Why PHP for a WebSocket Server?

It's an unconventional choice. WebSocket servers are typically written in Node.js, Go, or Python. But our entire backend — API, billing, fleet management, reporting — lives in Laravel (PHP). Building the OCPP server in PHP meant:

- **Shared models and business logic** — no duplicating billing rules across languages
- **Single deployment pipeline** — one stack to manage on our VPS
- **Faster iteration** — the team already thinks in PHP

We used **Ratchet** (built on ReactPHP) to handle the async WebSocket layer. The server listens on port 2060 with TLS, accepting persistent connections from chargers that authenticate via Basic Auth headers.

### Message Flow

OCPP 1.6 uses a simple JSON-RPC-like format: `[messageType, uniqueId, action, payload]`. When a charger sends a message, our server routes it through a switch-case dispatcher:

```
BootNotification  → Register charger, return heartbeat interval
StatusNotification → Update connector status (Available, Charging, Faulted...)
StartTransaction  → Match to a session, begin metering
MeterValues       → Track energy consumption in real time
StopTransaction   → Finalize session, calculate cost, trigger billing
Authorize         → Validate an RFID tag or VIN
```

Each handler updates the database, constructs an OCPP-compliant response, and optionally queues follow-up commands.

### The Bridge Pattern: Laravel ↔ OCPP

Here's where it gets interesting. The OCPP WebSocket server and the Laravel API are two separate processes. They need to communicate, but they can't call each other directly.

We solved this with what we call the **OcppBridge** — a producer-consumer model:

1. **Laravel → Charger:** When a user taps "Start Charging" in the app, the Laravel API writes a `ChargerCommand` record to the database (e.g., `RemoteStartTransaction`). The WebSocket server polls for pending commands every 5 seconds using a ReactPHP timer and pushes them to the appropriate charger.

2. **Charger → Laravel:** When the charger reports session data (MeterValues, StopTransaction), the WebSocket server writes directly to the shared database. Laravel reads this data for the dashboard, reports, and billing.

This decoupled architecture is simple and resilient. If the WebSocket server restarts, queued commands survive in the database. If the Laravel app is momentarily slow, charger communication continues uninterrupted.

### Session Lifecycle

A charging session goes through a carefully orchestrated flow:

```
[User taps "Start" in app]
       ↓
OcppBridge creates session (status: pending)
OcppBridge queues RemoteStartTransaction command
       ↓
WebSocket server sends command to charger
       ↓
Charger sends StartTransaction
Server matches transaction to pending session
Session status → active
       ↓
Charger sends MeterValues (every 30-60s)
Server tracks energy, calculates running cost
       ↓
Charger sends StopTransaction
Server finalizes session, deducts from wallet
Session status → finished
```

Simple enough on paper. In practice? That's where the bugs live.

---

## The Debugging Story: One Report, Nine Bugs

It started with a single report from our operations lead: *"Charger XC0003 at Burma Hills keeps failing. Users are being charged but not getting energy."*

We pulled the logs and the database. What we found wasn't one bug — it was a cascade of nine, each masking or amplifying the others.

### Bug #1: The Phantom Transaction ID

**The symptom:** MeterValues data was disappearing. Sessions showed 0 kWh even though the charger was clearly delivering power.

**The cause:** Our DC fast charger (XC0003) sends *two* `StartTransaction` messages per session — a quirk of its firmware. The first one matched the pending session correctly. The second one, arriving moments later, matched through a different code path (the fleet auto-start path) and **replaced** the transaction ID on the session.

Now the server was waiting for MeterValues tagged with the *new* transaction ID, while the charger was sending them with the *original* one. Data fell into a void.

**The fix:** A single `WHERE` clause addition — `AND fleet_id IS NOT NULL` — to ensure the fleet auto-start path only matches fleet sessions, not regular ones.

### Bug #2: The User ID That Shouldn't Exist

**The symptom:** Random users' charging sessions were being stopped mid-charge.

**The cause:** When the orphaned transaction ID from Bug #1 couldn't be matched to any session, the system's `getUserIdFromTransaction()` function had a fallback: return `user_id = 1`. This was a lazy placeholder from early development — "just pick *someone* so the code doesn't crash."

User 1's wallet balance hit zero from phantom charges. The system's balance check then triggered `RemoteStopTransaction` on all chargers where User 1 appeared to have active sessions. Those sessions belonged to *other users*.

**The fix:** Return `null` instead of `1`. Let the billing function bail out gracefully when no valid user is found.

### Bug #3: The Fee That Wouldn't Die

**The symptom:** Users were being charged the session fee twice.

**The cause:** A race condition between a cron job and the OCPP server. Here's the sequence:

1. Session expires (no charger response after 2 minutes)
2. Cron job refunds the session fee, sets `session_fee_paid = 0` and `status = 'failed'`
3. Charger *finally* sends `StopTransaction` (late, but valid)
4. OCPP server sees `session_fee_paid = 0` → deducts the fee again

The user paid once, got refunded, then paid again — net result: charged for a session that delivered nothing.

**The fix:** Two changes: skip `StopTransaction` processing for sessions already marked as `'failed'`, and check the `fee_refunded` flag before any deduction.

### Bug #4: The Fleet-Only Refund

**The symptom:** Non-fleet users lost their session fee (GHS 5) when a session delivered zero energy due to `EVDisconnected` errors.

**The cause:** The zero-energy refund logic was nested inside an `if ($session->fleet_id)` block. A copy-paste artifact from when fleet sessions were the only ones with session fees.

**The fix:** Moved the refund logic outside the fleet-only block. Four lines of code, moved up by one indentation level.

### Bug #5: The Wallet Race Condition

**The symptom:** A fleet manager who charged two vehicles simultaneously from one account occasionally saw incorrect wallet deductions — sometimes overcharged, sometimes undercharged.

**The cause:** Classic non-atomic read-modify-write:

```php
// Before (vulnerable to race conditions)
$balance = User::find($userId)->balanse;
$newBalance = $balance - $cost;
User::where('id', $userId)->update(['balanse' => $newBalance]);
```

When two `MeterValues` messages arrived within milliseconds, both reads saw the same balance, and the second write overwrote the first deduction.

**The fix:** Atomic SQL update:

```sql
UPDATE my_user SET balanse = balanse - ? WHERE id = ? AND balanse >= ?
```

One line. No race condition. The database handles concurrency for us.

### Bug #6: The Connector Swap

**The symptom:** On dual-connector chargers, starting a session on connector 2 sometimes "stole" connector 1's pending session.

**The cause:** The session matching fallback query matched on `user + idTag` but didn't include `connectorId`. If both connectors had pending sessions from the same user, the first one found won.

**The fix:** Added `connectorId` to the matching query.

### Bug #7: The Undead Cron Deduction

**The symptom:** Fees that were refunded kept reappearing on users' bills.

**The cause:** A separate cron job (`SessionUnpaidRecords`) scanned for finished sessions with `session_fee_paid = 0` and deducted the fee. It didn't check the `fee_refunded` flag — so it re-deducted fees that Bug #3's fix had already refunded.

**The fix:** Added `->where('fee_refunded', 0)` to the cron's query.

### Bug #8: The Inflated Sales Report

**The symptom:** Sales reports showed revenue for sessions that actually delivered zero energy.

**The cause:** When `total_cost` was `NULL`, the report fell back to summing all wallet operations for that session — including refunds and session fee operations. A session with a GHS 5 fee deducted and then refunded showed as GHS 10 in revenue.

**The fix:** Excluded `refund` and `session_fee` operation types from the fallback sum.

### Bug #9: The VIN That Arrived Too Early

**The symptom:** Chargers with ISO 15118 support reported the vehicle's VIN in `StartTransaction`, but the VIN never appeared on the session.

**The cause:** A timing mismatch. The charger detected the VIN during the plug-in handshake and included it in `StartTransaction`. But the mobile app hadn't created the session yet — so there was no session record to attach the VIN to.

**The fix:** Introduced a `pending_vin` column in the command buffer table. When a VIN arrives with no matching session, it's stored in the buffer. When a session is later matched, it picks up the buffered VIN.

---

## Lessons Learned

### 1. Cron Jobs Are Silent Killers

Three of our nine bugs involved cron jobs racing with real-time OCPP messages. The expired session checker runs every minute. The unpaid fee processor runs every 15 minutes. The stuck session cleaner runs every 15 minutes. Each one can modify session state independently.

**Our takeaway:** When you have both real-time handlers and periodic batch jobs touching the same records, you need to design for the overlap explicitly. Check status flags. Use atomic operations. Assume the other process already ran.

### 2. Fallback Values Are Technical Debt Bombs

`return 1` as a user ID fallback seemed harmless during development. In production, it became a ghost user that could kill anyone's charging session. Fallbacks that silently produce "some value" instead of failing are the most dangerous kind of technical debt.

**Our takeaway:** If a function can't find a valid result, return `null` and let the caller decide. A `NullPointerException` in the logs is infinitely better than silent data corruption.

### 3. Hardware Quirks Will Break Your Assumptions

We assumed one `StartTransaction` per session. Our DC fast charger sent two. We assumed VINs arrive *after* session creation. ISO 15118 sends them *before*. We assumed connectors are independent. They share a session matching namespace.

**Our takeaway:** Your OCPP server will encounter charger firmware from multiple manufacturers, each interpreting the spec slightly differently. Build your session matching to be defensive, and log everything.

### 4. The Financial Impact of "Minor" Bugs

We calculated the impact of these bugs over a 3-day window:
- **~61.7 kWh** of energy delivered but never billed (orphaned transaction IDs)
- **Double-charged session fees** on failed sessions
- **Lost GHS 5 per failed session** for non-fleet users (no refund)
- **Incorrect wallet balances** from race conditions

For a startup, these numbers matter. Each bug individually seemed minor. Together, they were silently eroding revenue and user trust.

### 5. Atomic Operations Are Non-Negotiable for Billing

Any code that touches money must use atomic database operations. Not "probably fine because requests are fast" — *must*. The moment you have concurrent users, periodic cron jobs, and real-time WebSocket messages all modifying the same wallet balance, every non-atomic operation is a potential financial discrepancy.

---

## Looking Ahead: ISO 15118 Plug-and-Charge

Our next challenge is implementing **Plug-and-Charge** — where a vehicle identifies itself via its VIN through ISO 15118, and the system automatically starts a billing session without any app interaction. The pieces are in place (VIN authorization, fleet vehicle lookup, session creation logic), but wiring them together introduces a third session-creation path alongside the mobile app and fleet auto-start.

Every new path is another surface for the kind of bugs we just fixed. This time, we're designing with those lessons baked in from the start.

---

## Conclusion

Building a custom OCPP server gave us the control we needed to iterate quickly and tailor the system to our operators' needs. But that control comes with responsibility — every edge case in the protocol, every charger firmware quirk, every cron-job timing window is yours to handle.

The nine bugs we found weren't the result of bad engineering. They were the result of a system growing organically, handling real-world complexity that no spec document fully captures. The fix wasn't just patching code — it was building a mental model of how every component interacts under concurrency, timing pressure, and hardware unpredictability.

If you're building an OCPP backend, here's my advice: **instrument everything, trust nothing, and make your billing atomic.** Your future self will thank you.

---

*Yaqoub — Software Engineer at XChargeEV*
*April 2026*
