# Producer-Consumer Over MySQL: A Low-Tech Approach to Process Communication

*How we connected a Laravel API to a Ratchet WebSocket server using nothing but a database table and a 5-second timer — and why we'd do it again.*

---

## Introduction

When your architecture has two separate processes that need to talk to each other, the industry answer is usually: Redis, RabbitMQ, Kafka, gRPC, or at minimum a Unix socket.

At XChargeEV, we have a **Laravel API** (HTTP, request-response) and a **Ratchet WebSocket server** (persistent connections to EV chargers via OCPP 1.6). They run as separate processes. They need to communicate bidirectionally. And we connected them with a MySQL table and a 5-second poll loop.

This isn't a "we were too lazy to set up Redis" story. It's a deliberate architectural decision that has held up through months of production traffic, multiple debugging sessions, and real money flowing through the system. Here's why it works, where it doesn't, and when you should consider the same approach.

---

## The Problem

Our system has two halves:

**The Laravel API** handles everything user-facing: authentication, wallet top-ups, session history, fleet management, and the mobile app's "Start Charging" / "Stop Charging" buttons. It runs as a standard PHP-FPM process behind Nginx.

**The OCPP WebSocket server** maintains persistent TCP connections with every charger in the network. Chargers send real-time messages (heartbeats, meter readings, status changes) and receive commands (start/stop charging, update configuration). It runs as a long-lived PHP process using Ratchet + ReactPHP.

These two processes share a MySQL database but cannot call each other directly. PHP-FPM processes are short-lived — they handle a request and die. The WebSocket server is a single long-running event loop. There's no natural RPC boundary between them.

The communication requirements:

- **Laravel → Charger:** User taps "Start Charging" → charger must receive `RemoteStartTransaction`
- **Charger → Laravel:** Charger sends `MeterValues` → dashboard must show real-time energy data
- **Latency tolerance:** 5-10 seconds is acceptable for command delivery. Chargers aren't latency-sensitive for remote commands.
- **Reliability:** Commands must not be lost. If the WebSocket server restarts, pending commands must survive.

---

## The Solution: Commands as Database Rows

### The ChargerCommand Table

```sql
CREATE TABLE charger_commands (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    charger_id VARCHAR(50) NOT NULL,
    command_type VARCHAR(50) NOT NULL,      -- RemoteStartTransaction, RemoteStopTransaction, etc.
    payload JSON NOT NULL,                   -- OCPP-formatted command body
    status ENUM('pending', 'sent', 'confirmed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    confirmed_at TIMESTAMP NULL
);
```

### The Producer: OcppBridge

When a user taps "Start Charging" in the mobile app, the Laravel controller calls the `OcppBridge`:

```php
class OcppBridge
{
    public function RemoteStartTransaction($chargerId, $connectorId, $idTag)
    {
        $payload = [2, uniqid(), "RemoteStartTransaction", [
            "connectorId" => $connectorId,
            "idTag" => $idTag
        ]];

        ChargerCommand::create([
            'charger_id' => $chargerId,
            'command_type' => 'RemoteStartTransaction',
            'payload' => json_encode($payload),
            'status' => 'pending'
        ]);
    }
}
```

That's it. The API's job is done. It writes a row and returns a response to the mobile app. The user sees "Starting..." in the UI.

The OcppBridge handles every command type: `RemoteStopTransaction`, `SetChargingProfile`, `ChangeConfiguration`, `TriggerMessage`, `ReserveNow`, `CancelReservation`, and more. Each one follows the same pattern: construct the OCPP JSON payload, write a row.

### The Consumer: 5-Second Timer

On the WebSocket server side, a ReactPHP periodic timer checks for pending commands:

```php
$loop->addPeriodicTimer(5, function () use ($connections) {
    $commands = ChargerCommand::where('status', 'pending')->get();

    foreach ($commands as $command) {
        $connection = $connections->getByChargerId($command->charger_id);

        if ($connection) {
            $connection->send($command->payload);
            $command->update([
                'status' => 'sent',
                'sent_at' => now()
            ]);
        }
        // If charger isn't connected, command stays pending
        // and will be picked up on the next cycle
    }
});
```

Every 5 seconds, the server queries for pending commands, matches them to active WebSocket connections, sends them, and marks them as sent. If a charger isn't connected, the command waits.

### The Return Path: Direct Database Writes

When a charger sends data back (MeterValues, StopTransaction, StatusNotification), the WebSocket server writes directly to the shared database — session records, meter readings, connector statuses. The Laravel API reads these on the next page load or API call.

No queue needed. The database *is* the shared state.

---

## Why This Works

### 1. Durability for Free

Commands survive process restarts. If the WebSocket server crashes and comes back up, pending commands are still in the database. If the Laravel API is slow or temporarily down, the WebSocket server doesn't care — it just keeps polling.

With Redis, you'd need to configure persistence (RDB snapshots or AOF). With a message queue, you'd need to handle acknowledgments and dead-letter queues. With MySQL, the data is durable by default. It's just rows.

### 2. Debuggability

When a command doesn't reach a charger, we open phpMyAdmin and look at the `charger_commands` table:

- **Status is `pending`?** The WebSocket server hasn't picked it up yet. Is it running? Is the charger connected?
- **Status is `sent` but no `confirmed_at`?** The charger received it but didn't respond. Firmware issue?
- **No row at all?** The API never created the command. Bug in the Laravel controller.

Compare this to debugging a Redis pub/sub message that was published but nobody subscribed to it. Or a RabbitMQ message sitting in a dead-letter queue. The database gives you a complete audit trail with timestamps, and you can query it with SQL.

### 3. No New Infrastructure

Our stack is PHP + MySQL + Nginx on a VPS. Adding Redis means another process to monitor, another failure point, another thing to configure backups for. For a small team operating in a market where infrastructure simplicity matters, every additional service is a maintenance burden.

MySQL is already there. It's already backed up. It's already monitored. The marginal cost of one more table is zero.

### 4. Natural Backpressure

If the WebSocket server falls behind, commands accumulate in the database. They don't overflow a memory buffer or get dropped. When the server catches up, it processes the backlog. The database is a naturally bounded buffer (limited by disk, which is effectively unlimited for our volume).

---

## Where This Doesn't Work

### Latency Below 1 Second

Our 5-second poll interval means commands take 0-5 seconds to reach the charger (average 2.5 seconds). For EV charging, this is fine — the user is standing next to a charger, and a 3-second delay between tapping "Start" and the charger clicking on is perfectly acceptable.

If you need sub-second latency, polling a database is the wrong pattern. Use a proper message broker or direct IPC.

### High Throughput

We process dozens of commands per minute across our charger network. If we were handling thousands per second, the polling query would become a bottleneck — either from query frequency or from contention on the `status` column index.

For high-throughput scenarios, a proper queue (Redis Streams, RabbitMQ, SQS) is the right tool.

### Complex Routing

All our commands go to one consumer (the WebSocket server). If we needed fan-out, topic-based routing, or multiple consumer groups, we'd need actual message queue semantics.

---

## The Polling vs. Push Trade-Off

The obvious critique: "Why poll when you could push?" We could use:

- **MySQL triggers** to notify the WebSocket server → fragile, hard to debug, couples the database to application logic
- **LISTEN/NOTIFY** (PostgreSQL) → we're on MySQL
- **Redis pub/sub** for notifications, MySQL for persistence → now we have two systems to keep consistent
- **Named pipes / Unix sockets** → ties us to a single server, no durability

Each alternative trades simplicity for latency. The 5-second poll is "wasteful" in the same way that a heartbeat is wasteful — it's a small, predictable cost that buys reliability and simplicity.

At our scale, the poll query takes <1ms. We run it 12 times per minute. The total database cost is negligible.

---

## Production Hardening

The basic pattern is simple, but production adds wrinkles:

### Stale Command Cleanup

Commands that stay `pending` for more than 10 minutes are likely stale (charger disconnected, user cancelled). A cleanup job marks them as `failed` and refunds any pre-deducted fees.

### Idempotent Processing

If the WebSocket server crashes after sending a command but before marking it `sent`, the next poll will re-send it. OCPP handles this gracefully — duplicate `RemoteStartTransaction` for an already-charging session returns `Accepted` with the existing transaction ID. But we added a `sent_at` timestamp check to avoid re-sending commands that were sent within the last 30 seconds.

### Connection State Awareness

The poll loop skips commands for chargers that aren't currently connected. This prevents a backlog of stale commands from flooding a charger when it reconnects. Instead, we process only the most recent pending command per charger on reconnection and mark older ones as `failed`.

---

## When to Use This Pattern

This approach makes sense when:

- **You already have a shared database** between the producer and consumer
- **Latency tolerance is measured in seconds**, not milliseconds
- **Throughput is low to moderate** (hundreds/minute, not thousands/second)
- **Durability matters more than speed** — you can't afford to lose commands
- **Your team is small** and infrastructure simplicity has real value
- **Debuggability is a priority** — you want to query your "queue" with SQL

It doesn't make sense when:
- You need real-time push (< 1 second)
- You have high throughput requirements
- You need complex routing, fan-out, or multiple consumers
- You're already running Redis/RabbitMQ for other reasons

---

## Conclusion

The best architecture isn't the one with the most components — it's the one where every component earns its place. For our use case, MySQL as a message bus is reliable, debuggable, durable, and requires zero additional infrastructure. It's boring in the best way.

When someone asks "why not Redis?", the answer isn't "we don't know about Redis." It's "we don't *need* Redis." The database table does the job. The 5-second delay is invisible to users. The audit trail has saved us hours of debugging. And we have one fewer service to monitor at 2 AM when a charger goes offline.

Sometimes the most sophisticated architectural decision is choosing not to add complexity.

---

*Yaqoub — Software Engineer at XChargeEV*
*April 2026*
