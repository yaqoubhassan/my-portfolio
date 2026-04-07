# Building AgriTrack Africa: How We Engineered a Livestock Management Platform for Offline-First, Multi-Tenant Agriculture

*A deep dive into the architecture, security patterns, and hard-won lessons from building a production-grade agricultural platform for African markets.*

---

**Published:** April 2026  
**Author:** Yaqoub  
**Tags:** `TypeScript` `NestJS` `Next.js` `React Native` `Monorepo` `System Design`

---

## The Problem Nobody Was Solving

Across Sub-Saharan Africa, livestock farming contributes over 30% of agricultural GDP — yet most farmers still track their herds with pen and paper. When a cow falls sick in a remote village in Northern Ghana, there is no connectivity, no record of its last vaccination, and no way for an investor monitoring a portfolio of farms to know what is happening on the ground.

AgriTrack Africa (ATA) set out to change that. But building software for this context meant confronting a unique set of constraints: unreliable internet, multi-language users, complex role hierarchies, and the need for financial-grade auditability. This is the story of how we built it — the architecture decisions, the patterns that saved us, and the mistakes we made along the way.

---

## Part 1: From "Just Ship It" to Monorepo

### The Initial Temptation

Like every early-stage project, ATA started with the temptation to throw everything into a single Next.js app with API routes and call it a day. After all, we needed a web dashboard, a mobile app, and an API — but surely we could share code between them?

The problem surfaced within the first week. We had a Zod schema for phone number validation:

```typescript
const phoneSchema = z.string().regex(/^\+?\d{7,15}$/)
```

This schema needed to exist in the NestJS API for request validation, in the Next.js dashboard for form validation, and in the React Native app for offline input checks. Copy-pasting it three times was not an option. We needed a monorepo.

### The Architecture We Landed On

We chose **pnpm workspaces + Turborepo** — and it turned out to be one of the best decisions of the entire project.

```
ata/
├── apps/
│   ├── api/          # NestJS 11 + TypeORM + PostgreSQL
│   ├── web/          # Next.js 16 + React 19 (Admin Dashboard)
│   ├── mobile/       # Expo 55 + React Native (Farmer App)
│   └── docs/         # Documentation site
├── packages/
│   ├── shared/       # Zod schemas, types, API queries, constants
│   ├── ui/           # Radix UI component library
│   ├── eslint-config/
│   └── typescript-config/
├── turbo.json
└── pnpm-workspace.yaml
```

The `shared` package became the backbone. It exports via subpaths — `@ata/shared/schemas`, `@ata/shared/types`, `@ata/shared/constants` — so every app imports the same validation logic, the same TypeScript interfaces, and the same API contract definitions.

**The result:** a phone number validated on the mobile app in a village in Tamale is validated with the *exact same Zod schema* that the API uses to reject malformed input in the cloud. Zero drift. Zero bugs from inconsistent validation.

### Turborepo: The Unsung Hero

Turborepo's incremental build caching cut our CI times dramatically. In our GitHub Actions pipeline, we run:

```bash
pnpm turbo run lint --filter="...[origin/main...HEAD]"
pnpm turbo run check-types --filter="...[origin/main...HEAD]"
```

This means: only lint and typecheck the packages that *actually changed* since the PR branched from `main`. When a developer touches only the mobile app, there is no reason to re-lint the API. Turborepo figures this out via its dependency graph.

But there was a subtlety that caught us off guard. When we updated a Zod schema in the `shared` package, Turborepo correctly detected that `api`, `web`, *and* `mobile` all depended on `shared` — and re-validated all three. This was exactly the behavior we wanted, but it meant that changes to shared schemas had a blast radius we had to respect. We started treating the `shared` package with the same discipline as a published npm library: review every change carefully, because it flows everywhere.

---

## Part 2: Security in Layers — Not as an Afterthought

### The Three Layers of Access Control

Agricultural platforms handle sensitive data — financial transactions, animal health records, proprietary breeding programs. ATA needed security that went beyond "slap JWT on it." We implemented three distinct layers:

**Layer 1: Authentication (JWT + Passport)**

Standard bearer token auth via `@nestjs/passport`. But the devil was in the details. Our `JwtStrategy` does not just validate the token — it loads the full user entity with roles from the database on every request:

```typescript
async validate(payload: JwtPayload) {
  const user = await this.userRepository.findOne({
    where: { id: payload.sub },
    relations: ['roles'],
  });
  if (!user || !user.isActive) throw new UnauthorizedException();
  return user; // Full user object with roles available downstream
}
```

This means a deactivated user's existing tokens immediately stop working. No waiting for token expiry. No stale role data cached in the JWT payload.

**Layer 2: Role-Based Access Control (RBAC)**

We defined six platform roles — `SUPER_ADMIN`, `ATA_ADMIN`, `FARM_OWNER`, `FARM_MANAGER`, `INVESTOR`, and `AGRONOMIST` — and enforced them via a custom `RolesGuard`:

```typescript
@Roles(RoleName.SUPER_ADMIN, RoleName.ATA_ADMIN)
@Get('admin/stats')
getPlatformStats() { ... }
```

The guard reads the `@Roles()` decorator metadata and checks the authenticated user's roles array. No decorator? Endpoint is open to all authenticated users. This declarative approach made it impossible to forget authorization — every endpoint either has explicit role requirements or is intentionally open.

**Layer 3: Farm-Level Isolation (Multi-Tenancy)**

Here is where things got interesting. An `ATA_ADMIN` can access platform-wide data, but a `FARM_MANAGER` should only see data for farms they belong to. We built a `FarmGuard` that queries the `farm_users` junction table:

```typescript
const membership = await this.farmUserRepo.findOne({
  where: {
    userId: user.id,
    farmId: requestedFarmId,
    revokedAt: IsNull(), // Must be active membership
  },
});
if (!membership) throw new ForbiddenException();
```

The `revokedAt` pattern was a deliberate choice over hard-deleting farm memberships. When a farm manager leaves, we set `revokedAt` to the current timestamp. Their historical activity logs remain linked to their user ID, but they lose all future access. This is critical for audit compliance — you need to know *who* recorded that vaccination six months ago, even if they no longer work on the farm.

### The OTP System That Taught Us About Rate Limiting

Our verification system supports OTP delivery via SMS (Africa's Talking), WhatsApp, and email. Each OTP has a 5-minute expiry, a maximum of 3 verification attempts, and a unique 6-digit code plus a UUID-based link token.

But here is what we learned the hard way: without rate limiting on the *request* side, an attacker could trigger thousands of OTP sends and rack up SMS costs. We implemented NestJS Throttler globally (100 requests/60 seconds), but the real lesson was about our AI chatbot endpoint.

### Subscription-Tiered Rate Limiting

ATA includes FarmBot — an AI-powered chat assistant for farmers. Free-tier users get 20 requests per minute; premium users get 50. We could not use NestJS Throttler's static configuration for this, so we built a custom `FarmbotThrottlerGuard` backed by Redis:

```typescript
const key = `${tier}:${userId}`;
const current = await this.redis.incr(key);
if (current === 1) await this.redis.expire(key, 60);
if (current > limit) {
  // Set rate limit headers and throw
  throw new ThrottlerException();
}
```

The Redis key format `${tier}:${userId}` means each user has their own counter, and upgrading from FREE to PREMIUM immediately increases their limit — no cache invalidation needed, because the tier is read fresh on each request.

We return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers so the mobile app can show a graceful "slow down" message instead of a cryptic error.

---

## Part 3: The Debounce Pattern That Saved Us From Email Floods

### The Problem

ATA supports investor accounts — people who fund farming operations and want visibility into financial performance. When a farm records transactions (feed purchases, animal sales, veterinary costs), investors should be notified.

In our initial implementation, every `transaction.created` event triggered an investor email. During month-end reconciliation, a farm manager might log 30 transactions in an hour. Thirty emails. The investors were not happy.

### The Solution: Queue-Based Debouncing

We implemented a debounce pattern using Bull queues that is one of the more elegant pieces of our architecture:

```typescript
@OnEvent('transaction.created')
async handleTransactionCreated(event: TransactionEvent) {
  const jobId = `investor-alert:${event.farmId}`;
  
  // Remove any existing delayed job for this farm
  const existingJob = await this.queue.getJob(jobId);
  if (existingJob) await existingJob.remove();
  
  // Schedule a new one, 10 minutes from now
  await this.queue.add('notify-investors', event, {
    jobId,
    delay: 600_000, // 10 minutes
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}
```

The key insight: every new transaction *resets the timer*. If a manager logs 30 transactions over 45 minutes, investors receive exactly **one** email — 10 minutes after the last transaction — with a consolidated summary including 30-day net profit calculations.

This pattern is broadly applicable anywhere you have high-frequency events that should produce low-frequency notifications. We have since applied the same approach to health event alerts and breeding status updates.

---

## Part 4: Offline-First Mobile — The Hardest Problem

### Why Offline Matters

In rural Ghana, 3G connectivity can disappear for hours. A farmer vaccinating cattle cannot stop mid-herd because the network dropped. The mobile app had to work *entirely offline* and sync when connectivity returned.

### WatermelonDB: The Right Tool for the Job

We chose WatermelonDB (`@nozbe/watermelondb`) for its lazy-loading architecture. Unlike SQLite wrappers that load entire tables into memory, WatermelonDB only materializes the records you query. For a farm with 2,000 animals, this is the difference between a smooth scroll and a frozen screen.

The offline sync pattern works like this:

1. **Farmer logs a vaccination offline.** The record is created locally with a client-generated ID.
2. **Connectivity returns.** The sync engine pushes all unsynced records to the API.
3. **API validates and persists.** The server assigns canonical IDs and returns the mapping.
4. **Client reconciles.** Local records update with server IDs; conflicts are resolved via last-write-wins with timestamp comparison.

The client-generated ID pattern was critical. Without it, we would need a network round-trip before the farmer could reference the newly created vaccination in subsequent offline operations (like linking it to a health event). With client IDs, everything chains locally and reconciles later.

### Background Reminders

Feed reminders need to fire even when the app is backgrounded. We use `react-native-background-timer` to schedule local notifications for upcoming feeding times. The `FeedingSchedule` entity stores `scheduledTime` in HH:MM format (24-hour), and the app calculates the next occurrence based on the frequency (DAILY, TWICE_DAILY, THREE_TIMES_DAILY, WEEKLY) and fires an Expo push notification.

---

## Part 5: The CI Pipeline That Catches Everything

Our GitHub Actions pipeline runs five jobs on every PR to `main`:

1. **Lint** — ESLint with zero-warning policy on frontend apps
2. **Typecheck** — `tsc --noEmit` across all packages
3. **Secret Detection** — `secretlint` scans for accidentally committed API keys, tokens, and credentials
4. **Dependency Audit** — `pnpm audit --prod` fails the build on known vulnerabilities
5. **SAST** — Semgrep static analysis with auto-detected rules

The secret detection step has already caught two near-misses: a developer accidentally included a test API key in a constants file, and a `.env.local` file almost made it into a commit. The scan runs against `apps/**/*.{ts,tsx,js,json,env*}` and `packages/**/*.{ts,tsx,js,json,env*}`.

Semgrep, the SAST tool, runs inside a container and applies language-aware rules automatically. It has flagged SQL injection risks in raw query strings, missing `await` on async operations, and unsafe regex patterns — all before code review even begins.

One non-obvious decision: we run lint and typecheck with Turborepo's `--filter` flag, but we run secret detection and SAST against the entire codebase every time. Security scanning is too important to optimize away with caching.

We also enforce conventional commits via `commitlint` and pre-commit hooks via Husky + lint-staged. Every commit message must follow the `feat:`, `fix:`, `chore:` format. This is not pedantry — it powers our changelog generation and makes `git log` actually useful for understanding what changed and why.

---

## Part 6: Data Modeling Decisions We Agonized Over

### Money in Pesewas, Not Cedis

Financial amounts are stored as integers representing pesewas (1 GHS = 100 pesewas). This avoids floating-point arithmetic entirely. When a farmer sells a goat for GHS 450.50, we store `45050`. All calculations happen in integer space, and we only convert to display format at the UI layer.

This is a well-known pattern, but it is surprising how many projects get this wrong. JavaScript's `0.1 + 0.2 !== 0.3` is not an academic curiosity when you are summing up a year's worth of farm transactions for an investor report.

### Soft Deletes Everywhere

Every entity extends a `BaseEntity` with `createdAt`, `updatedAt`, and `deletedAt` (nullable). When a record is "deleted," we set `deletedAt` to the current timestamp. The record remains in the database, queryable by admins and audit systems.

This was a regulatory decision. Agricultural subsidies, tax records, and investor reports may need to reference historical data years after it was "deleted" by a user. TypeORM's `@DeleteDateColumn` makes this transparent — all normal queries automatically exclude soft-deleted records via a `WHERE deletedAt IS NULL` clause.

### The ActivityLog: Immutable by Design

The `ActivityLog` entity is the only entity without `updatedAt` or `deletedAt`. It is append-only. Every significant action — creating an animal, recording a transaction, changing a user's role — writes a log entry with:

- **action:** `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, etc.
- **entityType & entityId:** What was affected
- **changes:** JSONB column storing before/after snapshots
- **userId & farmId:** Who did it and in which farm context
- **metadata:** Optional request info (IP, user-agent, device)

This immutable audit trail is what makes ATA viable for contexts where regulatory compliance matters. An investor can trace every financial transaction back to the user who recorded it, the device they used, and the exact changes they made.

---

## Part 7: What We Would Do Differently

### 1. Start With E2E Tests Earlier

Our unit test setup is ready (Jest + ts-jest), but end-to-end tests against a real database are still in progress. The debounce logic, the farm access guard, the OTP expiry — these are all patterns where unit tests with mocks give false confidence. We should have stood up a test database on day one.

### 2. GraphQL for the Mobile App

The REST API works well for the web dashboard, but the mobile app often needs deeply nested data (animal → health events → vaccinations → linked breeding records) and sometimes needs very little (just the animal count). REST forces us into either over-fetching or maintaining many specialized endpoints. GraphQL would have been a better fit for the mobile client's varied data needs.

### 3. Event Sourcing for Financial Data

Our current approach stores the latest state of financial transactions. For investor reporting, we often need to reconstruct the financial state *at a specific point in time*. Event sourcing — storing every state change as an immutable event — would make time-travel queries trivial. We may retrofit this for the financial module.

---

## Closing Thoughts

AgriTrack Africa is not just a CRUD app with a nice UI. It is a system that must work when the network does not, must be auditable when regulators come knocking, must be secure when handling financial data, and must be simple enough for a farmer who has never used software before.

The technical choices — monorepo for code sharing, layered security for multi-tenancy, queue-based debouncing for notification sanity, offline-first mobile for rural reality — all stem from deeply understanding the problem domain. The best architecture decisions are not about which framework is trendiest. They are about which trade-offs match your users' actual constraints.

We are still building. The FarmBot AI assistant, the real-time Socket.IO activity feeds, the subscription billing system — all are in active development. But the foundation is solid, and every piece of it was earned through real problems, not theoretical ones.

If you are building for markets where connectivity is unreliable, users are diverse, and data integrity is non-negotiable, I hope this deep dive gives you some useful patterns to steal.

---

*AgriTrack Africa is an open-source livestock management platform. The codebase is available on GitHub.*

*Have questions or want to discuss the architecture? Reach out — I am always happy to talk shop.*
