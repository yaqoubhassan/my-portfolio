# Designing a Wallet-Based Billing System for EV Charging

*Prepaid wallets, atomic operations, and the cron jobs that race your real-time server — lessons from billing real kilowatt-hours in production.*

---

## Introduction

Billing for EV charging sounds straightforward: measure the energy, multiply by the rate, charge the user. In practice, it's one of the hardest parts of running a charging network.

The energy isn't known upfront — it accumulates in real time as `MeterValues` stream from the charger. The session might fail halfway through. The user might have a subscription that changes the rate. A fleet manager might be paying on behalf of a driver. The charger might disconnect and reconnect. And through all of this, the user's wallet balance must stay accurate to the cedi.

At XChargeEV, we built a prepaid wallet system that handles all of these cases. This article covers the architecture, the financial edge cases that caught us off guard, and the concurrency bugs that cost us real money before we caught them.

---

## Why Prepaid Wallets?

In Ghana's EV charging market, prepaid wallets solve several practical problems:

1. **Payment infrastructure:** Mobile money (MTN MoMo, Vodafone Cash) and card payments via Hubtel/Paystack work well for top-ups but poorly for metered, real-time charges. A GHS 50 top-up is one transaction; metering GHS 0.03 every 30 seconds would be thousands.

2. **Instant authorization:** When a user taps "Start Charging," we need to know *immediately* if they can pay. Wallet balance check is a single database read. Payment gateway authorization would add seconds of latency and failure risk.

3. **Fleet billing flexibility:** Fleet managers can fund a corporate wallet or let drivers use individual wallets. The billing logic is the same either way — just different wallet sources.

4. **Refund simplicity:** Failed session? Credit the wallet instantly. No payment gateway refund flow, no 3-5 business day wait.

The trade-off is that users must top up before charging. But in practice, the mobile app makes top-ups fast enough that this isn't friction — it's just how the product works.

---

## The Billing Flow

### Session Fee: Deducted at Start

When a user starts a charging session, we immediately deduct a **session fee** (currently GHS 5). This covers the platform cost of the session regardless of energy consumed.

```
User taps "Start Charging"
    ↓
Check wallet balance ≥ session fee
    ↓ yes
Deduct session fee from wallet
Record operation: type='session_fee', money=-5
Set session.session_fee_paid = 1
    ↓
Queue RemoteStartTransaction to charger
Session status → pending
```

If the session fails (charger doesn't respond, connector error), the session fee is refunded:

```
Session expires (no StartTransaction within 2 minutes)
    ↓
Credit session fee back to wallet
Record operation: type='refund', money=+5
Set session.session_fee_paid = 0, fee_refunded = 1
Session status → failed
```

### Energy Billing: Deducted in Real Time

As the charger delivers energy, it sends `MeterValues` messages every 30-60 seconds. Each message includes the cumulative energy in Wh. Our server calculates the incremental cost and deducts it:

```
MeterValues arrives: energy = 5200 Wh (cumulative)
Previous reading: 4800 Wh
    ↓
Increment: 400 Wh = 0.4 kWh
Rate: GHS 2.50/kWh
Cost: GHS 1.00
    ↓
Deduct GHS 1.00 from wallet (atomic)
Record operation: type='charging', money=-1.00
Update session.total_cost += 1.00
Update session.total_energy = 5.2 kWh
```

### Balance Check: Stop When Empty

After each deduction, we check if the remaining balance can cover another metering interval. If not, we send `RemoteStopTransaction` to the charger:

```
Wallet balance after deduction: GHS 0.80
Estimated cost of next interval: GHS 1.00
    ↓
Balance insufficient → queue RemoteStopTransaction
Session ends gracefully
```

This prevents negative balances while giving the user maximum charging time.

### Session End: Final Reconciliation

When the charger sends `StopTransaction`, we finalize the session:

```
StopTransaction arrives
    ↓
Calculate final energy from meter readings
Calculate total cost
Verify against accumulated deductions
Session status → finished
```

---

## The Concurrency Problem

Here's where it gets interesting. Our billing system has **three independent actors** modifying wallet balances:

1. **The OCPP WebSocket server** — deducting energy costs in real time as MeterValues arrive
2. **Cron jobs** — deducting unpaid session fees, refunding failed sessions, cleaning up stuck records
3. **The Laravel API** — processing wallet top-ups from payment gateways

All three can hit the same user's wallet simultaneously.

### The Bug That Cost Real Money

We had a fleet manager — let's call him Philip — who regularly charged two vehicles at the same time from different chargers. His account had two active sessions, both sending `MeterValues` concurrently.

Our original billing code:

```php
// DON'T DO THIS
$user = User::find($userId);
$balance = $user->balanse;
$newBalance = $balance - $cost;
$user->update(['balanse' => $newBalance]);
```

The race condition:

```
Time 0ms: Session A reads balance = GHS 100
Time 1ms: Session B reads balance = GHS 100
Time 2ms: Session A writes balance = 100 - 3 = GHS 97
Time 3ms: Session B writes balance = 100 - 2 = GHS 98  ← overwrites Session A's deduction
```

Philip was charged GHS 2 instead of GHS 5. Over dozens of sessions per week, the discrepancy added up.

### The Fix: Atomic Updates

```php
// DO THIS
$affected = DB::table('my_user')
    ->where('id', $userId)
    ->where('balanse', '>=', $cost)
    ->update(['balanse' => DB::raw("balanse - {$cost}")]);

if ($affected === 0) {
    // Insufficient balance — trigger session stop
}
```

One SQL statement. The database handles the read-modify-write atomically. The `WHERE balanse >= cost` clause prevents negative balances. The `$affected` return tells us if the deduction succeeded.

This pattern applies everywhere money moves:

```php
// Top-up (atomic add)
DB::table('my_user')
    ->where('id', $userId)
    ->update(['balanse' => DB::raw("balanse + {$amount}")]);

// Refund (atomic add with audit)
DB::table('my_user')
    ->where('id', $userId)
    ->update(['balanse' => DB::raw("balanse + {$refund}")]);
```

---

## The Cron Job Coordination Problem

Atomic wallet operations solved the balance accuracy problem. But we had another class of bugs: **cron jobs and the OCPP server racing to modify session state.**

### The Double-Deduction Bug

Here's a scenario that actually happened:

1. **T+0s:** User starts session. Session fee (GHS 5) deducted. `session_fee_paid = 1`.
2. **T+90s:** Charger doesn't respond. No `StartTransaction` received.
3. **T+120s:** `check:expired-sessions` cron runs. Session has no activity for 2 minutes. Cron refunds the fee: `session_fee_paid = 0`, `fee_refunded = 1`, `status = 'failed'`.
4. **T+125s:** Charger finally sends `StartTransaction` (it was slow, not dead).
5. **T+125s:** OCPP server processes `StopTransaction` later. Sees `session_fee_paid = 0`. Deducts the fee again.

The user paid GHS 5, got GHS 5 refunded, then paid GHS 5 again — for a session that may have delivered zero energy.

### The Undead Re-Deduction

Even after fixing the above, another cron created the same problem:

1. Session ends. Fee was refunded (`session_fee_paid = 0`, `fee_refunded = 1`).
2. `session:process-unpaid-records` cron scans for sessions where `session_fee_paid = 0`.
3. It doesn't check `fee_refunded`. Deducts the fee again.

### The Fix: State Machine Discipline

We learned that session fee state needs to be treated as a **state machine**, not independent boolean flags:

```
States:
  - PENDING:   session_fee_paid=0, fee_refunded=0 → fee not yet deducted
  - PAID:      session_fee_paid=1, fee_refunded=0 → fee active
  - REFUNDED:  session_fee_paid=0, fee_refunded=1 → fee returned, DO NOT re-deduct
```

Every piece of code that touches the session fee — OCPP handlers, cron jobs, API endpoints — must check both flags. The rule is simple: **if `fee_refunded = 1`, never deduct.**

---

## Fleet Billing: Two Modes, One Wallet System

Fleet management adds a layer of complexity. XChargeEV supports two billing modes per fleet:

### Corporate Billing
The fleet pays for all charging. Energy costs are deducted from the fleet's corporate wallet. Individual drivers don't pay anything.

```
MeterValues → cost = GHS 3.00
    ↓
billing_type = 'corporate'
    ↓
Deduct from fleet.corporate_balance (not driver's wallet)
```

### Individual Billing
Drivers pay from their own wallets, but the fleet can set limits (max kWh per session, max spend per month). The fleet is essentially an authorization layer, not a payment layer.

```
MeterValues → cost = GHS 3.00
    ↓
billing_type = 'individual'
    ↓
Check driver limit: monthly_spend + 3.00 ≤ monthly_limit?
    ↓ yes
Deduct from driver's personal wallet
```

The wallet system doesn't care about the billing mode — it just processes atomic deductions from whichever balance it's pointed at. The fleet logic sits above the wallet, deciding *whose* wallet to deduct from.

---

## Subscription Pricing

Users can subscribe to discounted charging rates. A subscription modifies the per-kWh rate:

```
Standard rate: GHS 2.50/kWh
Subscriber rate: GHS 2.00/kWh
```

The billing code checks subscription status at each `MeterValues`:

```php
$rate = $user->hasActiveSubscription()
    ? $connector->subscriber_price
    : $connector->price;

$cost = ($incrementalEnergy / 1000) * $rate;
```

Subscriptions are managed by a separate cron (`check:expired-subscriptions`) that deactivates expired ones. The billing code doesn't cache the subscription status — it checks live on every deduction, so a subscription expiring mid-session is handled correctly.

---

## The Audit Trail

Every wallet movement is recorded as an **operation** with a type:

| Type | Direction | Description |
|------|-----------|-------------|
| `topup` | + | User adds funds via payment gateway |
| `session_fee` | - | Platform fee deducted at session start |
| `charging` | - | Energy cost during active session |
| `refund` | + | Fee or energy refund for failed session |
| `subscription` | - | Subscription payment |

This gives us a complete ledger per user. When a user disputes a charge, we can reconstruct exactly what happened:

```sql
SELECT type, money, created_at, session_id
FROM my_user_operations
WHERE user_id = ?
ORDER BY created_at DESC;
```

### The Sales Report Bug

Even the audit trail had a bug. When `total_cost` was `NULL` on a session (because it was never properly finalized), the sales report fell back to summing all operations for that session:

```php
// Bug: includes refunds and fee operations
$revenue = $operations->sum('money'); // GHS 10 (5 fee + 5 refund = |5| + |5|)
```

This inflated revenue on the dashboard. The fix: exclude `refund` and `session_fee` operations from the fallback sum, only counting actual `charging` operations.

---

## Key Takeaways

### 1. Atomic Operations Are Non-Negotiable
Any code that modifies a wallet balance must use atomic SQL updates. Not "probably safe because requests are fast." The moment you have concurrent sessions, cron jobs, and payment webhooks, non-atomic reads become financial bugs.

### 2. Design Fee Logic as a State Machine
Boolean flags like `session_fee_paid` and `fee_refunded` should be treated as a state machine with explicit transitions. Every consumer of that state (OCPP handlers, cron jobs, API) must respect the full state, not just one flag.

### 3. Prepaid Simplifies Everything
By requiring funds upfront, we avoid the entire class of problems around failed charges, expired cards, and post-session payment disputes. The wallet balance is the single source of truth for "can this user charge?"

### 4. Log Every Money Movement
An operation ledger isn't just for compliance — it's your debugging superpower. When a user says "I was charged wrong," the ledger tells you exactly what happened, when, and why.

### 5. Test with Concurrent Sessions
Single-session testing will never surface race conditions. Your test suite needs scenarios where two sessions bill the same wallet simultaneously, where a cron job fires during an active session, and where a payment webhook arrives while energy is being metered.

---

*Yaqoub — Software Engineer at XChargeEV*
*April 2026*
