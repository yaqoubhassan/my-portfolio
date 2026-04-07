# When Cron Jobs Race Your Real-Time Server

*How six independent scheduled tasks nearly broke our EV charging billing — and the orchestration pattern that fixed it.*

---

## Introduction

Here's a scenario: a user starts charging their EV. Ninety seconds in, a cron job decides the session is expired and refunds the fee. Five seconds later, the charger sends `StartTransaction` — it was just slow, not dead. The OCPP server picks up the now-refunded session, the charger starts delivering energy, and when it stops, the server deducts the fee again.

The user was charged twice. The session was both "failed" and "active" at different points. And neither the cron job nor the OCPP server did anything wrong — they each followed their logic perfectly. The bug was in the *interaction*.

This is a story about what happens when periodic batch jobs and real-time event handlers share mutable state, and how we learned to make them coexist.

---

## The Cast of Characters

Our EV charging platform has a Ratchet WebSocket server handling real-time OCPP messages from chargers, and a Laravel backend with several scheduled tasks. Here's who touches charging session records:

### Real-Time: The OCPP Server
- Processes `StartTransaction`, `MeterValues`, `StopTransaction` as they arrive
- Updates session status, energy readings, and wallet balances
- Operates on individual sessions as events occur
- Latency: milliseconds

### Scheduled: The Cron Jobs

| Job | Frequency | What it does |
|-----|-----------|-------------|
| `check:expired-sessions` | Every 1 min | Finds sessions with no charger activity for >2 minutes, refunds fees, marks as 'failed' |
| `session:cleanup-stuck` | Every 15 min | Finds sessions stuck in 'active' for >2 hours, marks as 'finished' or 'failed' |
| `session:process-unpaid-records` | Every 15 min | Finds finished sessions where the session fee wasn't paid, deducts it |
| `session:cleanup-duplicates` | Every 15 min | Removes duplicate sessions created by race conditions |
| `session:create-missing` | Every 15 min | Creates session records for orphaned transactions |
| `session:backfill` | Every 15 min | Backfills missing data on incomplete session records |

Six jobs. All touching the same `sessions` table. All running on their own schedule, unaware of each other and unaware of what the OCPP server is doing right now.

---

## The Three Bugs

### Bug #1: The Premature Expiry

**The race:**

```
T+0s     User taps "Start Charging"
         → Session created (status: pending, session_fee_paid: 1)

T+120s   check:expired-sessions runs
         → Session has no StartTransaction for 2 min
         → Refund fee, set status='failed', session_fee_paid=0, fee_refunded=1

T+125s   Charger sends StartTransaction (it was slow)
         → OCPP server matches to session
         → Session status → active (but fee was already refunded)

T+600s   Charger sends StopTransaction
         → OCPP server sees session_fee_paid=0
         → Deducts fee again ← BUG: double charge
```

**The root cause:** The expiry cron and the OCPP server have different definitions of "this session is dead." The cron uses a time threshold. The OCPP server trusts the charger. When the charger is slow but not dead, they disagree.

**The fix:** The OCPP server's `endSessionIfExists()` now checks `fee_refunded` before deducting and skips sessions with status `'failed'`:

```php
if ($session->status === 'failed') {
    return; // Already handled by expiry cron
}

if (!$session->fee_refunded && !$session->session_fee_paid) {
    // Safe to deduct — fee was never paid or refunded
    $this->deductSessionFee($session);
}
```

### Bug #2: The Zombie Re-Deduction

**The race:**

```
T+0s     Session starts, fee paid
T+300s   Session finishes with zero energy (EVDisconnected)
         → OCPP server refunds fee: session_fee_paid=0, fee_refunded=1

T+900s   session:process-unpaid-records runs
         → Finds sessions where session_fee_paid=0
         → Doesn't check fee_refunded
         → Deducts fee again ← BUG
```

**The root cause:** The unpaid records cron was written before the refund flag existed. It only knew about one dimension of the fee state (`paid` or `not paid`) and didn't understand the third state (`refunded`).

**The fix:** Added `->where('fee_refunded', 0)` to the cron's query. Now it only deducts from sessions that genuinely never had the fee paid — not ones where it was paid and then refunded.

### Bug #3: The Stuck Session Cleanup Conflict

**The race:**

```
T+0s       Session starts, status='active'
T+7200s    session:cleanup-stuck runs
           → Session active for >2 hours
           → Marks as 'finished', calculates final cost

T+7201s    Charger sends StopTransaction (charger had a long session)
           → OCPP server processes stop for already-finished session
           → Re-calculates cost, potentially double-billing energy
```

**The root cause:** A session being "stuck" for 2 hours might mean it's genuinely stuck (charger lost connectivity) or that it's a legitimate long charge. The cron can't distinguish between them.

**The fix:** Before marking a session as finished, check if the charger is still connected to the WebSocket server. If connected, leave the session alone — the charger will eventually send `StopTransaction`. Only clean up sessions where the charger has been offline for an extended period.

---

## The Underlying Pattern

All three bugs share the same structure:

1. **Real-time handler** takes an action on a session based on an event
2. **Cron job** takes a *different* action on the same session based on a time threshold
3. **The actions conflict** because neither knows about the other's state changes
4. **The result** is a financial error: double-deduction, missing refund, or inflated billing

This is a coordination problem. The classic solutions are:

- **Locks:** Acquire a mutex before modifying a session → adds complexity, risk of deadlocks, doesn't work well across process boundaries
- **Event sourcing:** All state changes are events in an append-only log → massive architectural change, overkill for our scale
- **State machine with guards:** Each actor checks the full session state before acting → simple, local, no infrastructure changes

We chose the third option.

---

## The State Machine Approach

### Session States

```
pending → active → finished
    ↓                ↓
  failed          failed
    ↓                ↓
   (terminal)     (terminal)
```

### State Transition Rules

Every actor — OCPP server or cron job — must follow these rules:

| Current State | Actor | Allowed Transition | Guard Condition |
|---------------|-------|-------------------|-----------------|
| pending | OCPP (StartTransaction) | → active | Always |
| pending | Cron (expired) | → failed | No activity for >2 min |
| active | OCPP (StopTransaction) | → finished | Always |
| active | Cron (stuck cleanup) | → finished/failed | Charger offline AND session >2 hours |
| failed | OCPP (StopTransaction) | *no transition* | Skip processing |
| finished | Cron (unpaid records) | *no transition to status* | Only deduct if `fee_refunded=0` |

The key insight: **transitions to terminal states (`failed`, `finished`) are one-way, and no actor should re-process a terminal session.**

### Fee State Machine

```
UNPAID    (session_fee_paid=0, fee_refunded=0) → initial
    ↓ deduct
PAID      (session_fee_paid=1, fee_refunded=0) → normal state
    ↓ refund
REFUNDED  (session_fee_paid=0, fee_refunded=1) → terminal, never re-deduct
```

Every piece of code that touches the fee checks both flags. The `REFUNDED` state is a tombstone — it means "we already dealt with this, leave it alone."

---

## From Six Independent Crons to an Orchestrated Pipeline

Beyond the state machine fixes, we had a structural problem: six cron jobs running independently with overlapping concerns. The cleanup-stuck job and the expired-sessions job could both try to fail the same session in the same minute. The create-missing job and the backfill job could race on the same orphaned transaction.

### The Maintenance Pipeline

We consolidated the five 15-minute jobs into a single orchestrator:

```php
class SessionMaintenance extends Command
{
    protected $signature = 'session:run-maintenance';

    public function handle()
    {
        $this->call('session:cleanup-duplicates');
        $this->call('session:backfill');
        $this->call('session:cleanup-stuck');
        $this->call('session:process-unpaid-records');
        $this->call('session:create-missing');
    }
}
```

The jobs run **sequentially** within the pipeline. Duplicates are cleaned before backfill runs. Stuck sessions are resolved before unpaid records are processed. Missing sessions are created last, after all other cleanup is done.

This eliminates the class of bugs where Job A modifies a record that Job B is currently processing. They take turns.

The `check:expired-sessions` job still runs every minute independently — it has a different cadence and purpose. But it now respects the same state machine guards as everything else.

### Locking

Each maintenance sub-job acquires a cache lock before processing:

```php
$lock = Cache::lock('session:cleanup-stuck', 300); // 5-minute TTL

if ($lock->get()) {
    try {
        // Process stuck sessions
    } finally {
        $lock->release();
    }
}
```

This prevents overlapping runs if a maintenance cycle takes longer than 15 minutes. The lock TTL ensures it auto-releases if the process crashes.

---

## Monitoring: Catching Races Before Users Do

After fixing the bugs, we added monitoring to detect regressions:

### 1. Refunded-Then-Deducted Check

A daily query that finds sessions where a fee was refunded and then deducted again:

```sql
SELECT s.id, s.session_fee_paid, s.fee_refunded
FROM sessions s
WHERE s.fee_refunded = 1 AND s.session_fee_paid = 1;
-- This should ALWAYS return zero rows
```

### 2. Double-Operation Detection

Find sessions with more than one `session_fee` deduction:

```sql
SELECT session_id, COUNT(*) as fee_deductions
FROM my_user_operations
WHERE type = 'session_fee' AND money < 0
GROUP BY session_id
HAVING fee_deductions > 1;
```

### 3. State Inconsistency Scan

Find sessions in impossible states:

```sql
-- Active sessions with no charger connection for >30 minutes
SELECT s.id FROM sessions s
JOIN chargers c ON s.charger_id = c.id
WHERE s.status = 'active'
AND c.last_heartbeat < NOW() - INTERVAL 30 MINUTE;
```

---

## Lessons Learned

### 1. Document the Interaction Matrix

For every piece of mutable state, list every actor that reads or writes it. If two actors can write to the same field, you have a potential race. Make the coordination explicit in the code, not implicit in "well, the cron runs every 15 minutes and the OCPP handler is fast, so they probably won't overlap."

They will overlap. On a Friday night. During a demo.

### 2. Terminal States Are Sacred

Once a session is `failed` or `finished`, no actor should modify it in a way that has financial side effects. These states are tombstones. Cron jobs should filter them out. OCPP handlers should skip them. If you need to "reopen" a terminal session, that's a new operation with an audit trail, not a casual state change.

### 3. Sequential > Parallel for Dependent Jobs

If your cron jobs touch the same data, run them in sequence. The performance cost is negligible (seconds, for batch jobs), and the correctness guarantee is invaluable. Save parallelism for jobs that are truly independent.

### 4. The Cron Job Wrote the Check, the OCPP Server Cashed It

The hardest bugs to find are the ones where each component's logs look perfectly normal. The cron job correctly identified an expired session. The OCPP server correctly processed a `StopTransaction`. Both did their jobs. The bug was invisible until you interleaved their timelines.

When debugging billing discrepancies, the first question should always be: "Did a cron job touch this session between the start and stop events?"

---

## Conclusion

Real-time systems and batch jobs coexist in almost every production system. The challenge isn't preventing them from running concurrently — it's making sure they agree on what the current state means and what transitions are valid.

State machines, sequential pipelines, and atomic operations aren't glamorous. They won't make it into a conference talk about distributed systems. But they're the difference between a billing system that loses money in subtle, hard-to-detect ways and one that handles every edge case — including the ones where your own infrastructure is the adversary.

---

*Yaqoub — Software Engineer at XChargeEV*
*April 2026*
