# Connecting 12+ Microservices: Lessons from Building the MTN Self-Service Portal Frontend

*How we tamed a sprawling backend ecosystem, hardened the frontend against real-world threats, and shipped a performant telecom portal — one painful lesson at a time.*

---

When I joined the team building MTN Ghana's Self-Service Portal, the brief sounded simple: give subscribers a single web app to manage their broadband accounts, buy bundles, file complaints, swap SIMs, and track orders. Under the hood, that "single app" had to talk to **twelve different backend microservices** — each with its own API contract, authentication scheme, latency profile, and failure mode.

This is the story of what we built, what broke, and what we learned.

## The Stack at a Glance

- **React 19 + TypeScript** on **Vite** — fast builds, strict types
- **TailwindCSS** for styling, mobile-first
- **Auth0** for authentication and SSO
- **OpenTelemetry** for distributed tracing and observability
- **11+ distinct API services** spanning customer data, payments, broadband, fibre, SIM management, complaints, subscriptions, and more

No Redux. No Zustand. Just React Context, custom hooks, and a service layer we designed from scratch. I'll explain why.

---

## Part 1: The Microservice Map

Here's a simplified view of the services our frontend integrates with:

| Service | Responsibility |
|---|---|
| Customer Data API | Account data, paired devices, balances, bundles |
| Ticketing API | Trouble tickets and complaint management |
| Connectivity Check API | Service availability checks, location data |
| Broadband API | Usage calculators, broadband bundle management |
| Payment Gateway | Card payment initialization |
| Cart Service | Bundle cart operations |
| Order Service | Order creation and lifecycle |
| Identity Verification API | National ID verification |
| SIM Management API | SIM swap eligibility and submission |
| OTP Service | First-time user verification |
| Subscriptions API | Subscription management |

Each of these services lives behind a different base URL, expects different headers, and returns data in subtly different shapes. Some require a tenant identifier header. Some need a separate API key. All of them need a Bearer token from our identity provider — but scoped to different audiences.

**The first lesson**: in a microservice architecture, the frontend isn't just a UI layer. It's an **integration layer**, and that integration work is where most of the complexity lives.

---

## Part 2: The Service Layer Pattern

Early on, we made a decision that paid dividends throughout the project: **every API gets its own service class**.

We designed each service as a self-contained class responsible for all communication with its corresponding backend. For example, the broadband service class holds its own base URL and header configuration, and exposes methods for each operation. When a method is called, it first checks an in-memory cache using a deterministic key derived from the request parameters. If a valid cached result exists, it returns immediately without making a network request. Otherwise, it issues the HTTP call with the appropriate authentication headers, stores the response in the cache with a thirty-minute time-to-live, and returns the data.

Each service class owns:
- Its base URL and header configuration
- An in-memory cache with TTL-based expiry
- Request/response transformation
- Error normalization

This meant that when the Broadband API team changed their response shape (which happened more than once), the fix was isolated to a single file. No grep-and-pray across components.

### Why Not Redux?

We considered Redux Toolkit and RTK Query. For a portal that aggregates data from 12+ services — each with different caching needs, auth requirements, and error shapes — Redux would have added ceremony without solving the actual problem. Our services needed **per-endpoint caching strategies**, not a global store.

React Context + custom hooks gave us co-located state that was easy to reason about:

Each feature area gets its own custom hook that manages its data lifecycle. The broadband accounts hook, for instance, maintains a list of devices and a set that tracks which devices currently have balance requests in flight. When the hook kicks off background balance loading, it iterates through the device list one by one. For each device, it adds that device's identifier to the loading set, calls the broadband service to fetch the balance, and then updates just that one device in the list with the returned data. Once the call completes (whether it succeeds or fails), the device is removed from the loading set. This means each device card in the UI can independently show its own loading state.

This pattern — **progressive data loading** — was critical for the broadband page. A user might have 8+ paired numbers, each requiring a separate balance API call. Instead of blocking the UI until all balances load, we render the device list immediately and fill in balances as they arrive. The `loadingBalances` Set tracks exactly which cards are still fetching, so each card can show its own spinner independently.

---

## Part 3: Auth — The Quiet Nightmare

Authentication sounds straightforward until you're dealing with:
- Auth0 tokens scoped to different audiences
- Cross-subdomain SSO with shared cookie domains
- Silent token refresh that occasionally fails
- Identity verification status buried in custom metadata claims

### The Token Audience Problem

Different backend services expect tokens scoped to different audiences. The SIM Management API, for instance, requires a token scoped to its own audience — not the general portal audience. This meant we couldn't just fetch a token once and reuse it everywhere.

We built a token management layer that:
1. Caches tokens per audience
2. Refreshes them 5 minutes before expiry
3. Falls back to silent re-authentication on cache miss

### Custom Claims and the KYC Maze

Our identity provider returns user metadata in custom claims — namespaced JSON objects containing identity verification status, phone verification state, subscriber type, and connection method (social login vs. direct).

Parsing these claims reliably — across login flows, token refreshes, and edge cases where metadata arrives partially — required defensive coding at every layer. We learned to never trust that a claim field exists just because the docs say it should.

---

## Part 4: Security Hardening — Lessons from a Penetration Test

Midway through the project, a security scan flagged several areas for improvement. Here's what we built in response.

### Input Sanitization

We implemented a context-aware sanitization utility that handles different input types differently:

The sanitizer accepts a context parameter that determines which cleaning strategy to apply. For telephone inputs, it uses an allowlist approach, stripping everything except digits, plus signs, hyphens, parentheses, and spaces. For email inputs, it permits only alphanumeric characters, periods, the at symbol, plus signs, and hyphens. For general free-text inputs, it runs a more aggressive multi-pass process designed to neutralize cross-site scripting vectors.

The general sanitizer runs multiple passes to catch nested injection attempts — `<scr<script>ipt>` patterns that survive a single strip pass. It detects and neutralizes:
- `<script>` tags
- `javascript:` and `data:` protocol URIs
- Inline event handlers (`onerror=`, `onload=`)
- Encoded payloads

### The Payload Sanitization Layer

Beyond input fields, we added sanitization at the **API request boundary**. Before any payload leaves the browser, it passes through a sanitizer that recursively walks the object tree and cleans every string value:

The payload sanitizer works by recursively walking through any data structure before it is sent over the network. If it encounters a string, it runs the general sanitization function on it. If it encounters an array, it processes each element. If it encounters a nested object, it processes each value within that object. Primitive values like numbers and booleans pass through untouched. This ensures that every string in every outbound request is cleaned, regardless of how deeply nested it is.

This was a **defense-in-depth** decision. Even if a component forgets to sanitize its inputs, the service layer catches it before it hits the wire.

### Secure ID Generation

We discovered early that exposing raw MSISDNs (phone numbers) in URLs and component keys was a privacy risk. The solution: hash-based secure IDs.

We created a utility that takes a sensitive identifier (such as a subscriber phone number), combines it with an application-specific salt value, and runs it through a one-way hash function. The output is a stable, non-reversible string that consistently maps to the same subscriber but reveals nothing about the original identifier.

This gave us stable identifiers for routing and caching without exposing subscriber phone numbers in the browser's address bar, dev tools, or session storage.

### Security Headers

Every outbound request includes:
- `Authorization: Bearer {token}` — audience-scoped
- A tenant identifier header — prevents tenant confusion in multi-tenant backends
- `Content-Type` enforcement

We also added `X-Robots-Tag: noindex, noarchive` at the Nginx level to prevent search engines from indexing the portal — a small but important detail for an authenticated application.

---

## Part 5: Caching — Three Layers Deep

Performance in a portal that aggregates 12 services is fundamentally a caching problem. We implemented three caching layers:

### Layer 1: In-Memory Service Cache (TTL: 30 minutes)

Each service class maintains a `Map<string, CachedResponse>`. Repeated calls with the same parameters hit the cache instead of the network. Cache keys are deterministically generated from request parameters.

### Layer 2: SessionStorage (TTL: session lifetime)

Device-to-account mappings, user preferences, and feature flags are persisted in `sessionStorage`. This survives page refreshes but clears on tab close — the right tradeoff for data that shouldn't persist indefinitely but shouldn't require a network call on every navigation.

We also built an automatic cleanup mechanism that runs every 5 minutes, evicting stale entries to prevent `sessionStorage` bloat.

### Layer 3: LocalStorage (TTL: 24 hours)

Location data for fibre availability checks — which changes infrequently — lives in `localStorage` with a 24-hour TTL. This means returning users don't re-fetch the entire location database on every visit.

### Cache Invalidation

The hardest problem in computer science, and we hit it head-on. Our rules:
- **On logout**: nuke everything. In-memory caches, session storage, local storage.
- **On explicit refresh**: invalidate the specific cache key, not the entire cache.
- **On auth failure (401)**: invalidate token caches and trigger silent re-auth.
- **On data mutation**: invalidate related read caches (e.g., after filing a complaint, invalidate the complaints list cache).

---

## Part 6: Error Handling Across Service Boundaries

When you depend on 12 services, something is always failing. Our approach evolved through three phases:

### Phase 1: Naive Try-Catch (Don't Do This)

Our first approach was a simple catch-all: wrap each service call in an error handler that, on any failure, displays a generic "something went wrong" message and moves on.

The problem: "Something went wrong" tells the user nothing. And swallowed errors make debugging impossible.

### Phase 2: Error Normalization

Each service class now transforms API errors into a consistent shape:

Each service class now transforms raw API errors into a standardized error shape containing a code, a human-readable message, a flag indicating whether the error is transient and worth retrying, and the name of the originating service.

Components can then make intelligent decisions: show a retry button for transient failures, show a specific message for business logic errors, and escalate unknown errors to the error boundary.

### Phase 3: Retry with Exponential Backoff

For transient failures (network timeouts, 503s), we implemented automatic retry with exponential backoff:

The first attempt fires immediately. If it fails, the system waits one second before the second attempt, two seconds before the third, and three seconds before the fourth and final attempt. If all four attempts fail, the error is surfaced to the user.

This recovered gracefully from the momentary blips that are inevitable when you're talking to a dozen services across different infrastructure.

---

## Part 7: Observability — You Can't Fix What You Can't See

We integrated **OpenTelemetry** from day one — not as an afterthought, but as a core architectural decision.

During application initialization, we set up a tracing provider that identifies all telemetry data as originating from the customer portal. Trace data is batched and exported to our observability backend via the OpenTelemetry protocol. We also registered automatic instrumentation for all outbound network requests (both modern fetch calls and legacy XMLHttpRequest calls) as well as the initial document load. The instrumentation is configured to propagate trace context headers to our allowed backend domains, ensuring that a single trace can follow a request from the browser all the way through to backend services.

This gives us:
- **Distributed traces** that follow a request from button click through the frontend, across the network, and into backend services
- **Performance metrics** exported on a configurable interval
- **Structured logs** correlated with trace IDs

When a user reports "the complaints page is slow," we don't guess. We pull the trace and see exactly which service call took 8 seconds.

---

## Part 8: UI Patterns That Survived Production

### Granular Loading States

Instead of a single `isLoading` boolean, we use typed loading state:

Rather than using a single boolean to represent loading state, we use a set data structure that holds the identifiers of whichever accounts are currently being fetched. This allows us to check whether any individual account is loading by testing membership in the set.

Each account card manages its own loading state. When 8 accounts are loading balances in parallel, the user sees progress on each card individually rather than staring at a blank screen.

### Progress Indicators with Anti-Flicker

We added 100ms minimum display times for loading indicators. Without this, fast network responses cause loading spinners to flash for a single frame — worse UX than no spinner at all.

### Color-Coded Status Badges

The complaints feature required distinct visual treatment for each status (Open, In Progress, Resolved, Closed, Escalated). We built a status badge system with semantic color mapping that scales to new statuses without code changes.

### Optimistic Nickname Updates

When a user renames a broadband device, we update the UI immediately and sync to the backend in the background. A subtle "Saving..." indicator appears only if the API call takes longer than expected.

---

## Part 9: Feature Flags and Gradual Rollout

Not every feature was ready for every environment. We implemented environment-based feature flags:

At build time, the application reads environment variables to determine which features should be active. Each feature flag is a simple boolean derived from the build environment configuration. If the variable is set to a truthy value, the feature is enabled; otherwise, it is hidden from users entirely.

This let us:
- Deploy to staging with features enabled for QA
- Deploy to production with features disabled
- Enable features per-environment without code changes
- Roll back a feature instantly by flipping an environment variable

Simple, but it saved us from several "it's not ready yet" panics.

---

## Part 10: What I'd Do Differently

### 1. API Contract Testing from Day One

We lost weeks to backend contract changes that broke the frontend silently. In hindsight, contract tests (Pact or similar) between the frontend and each service would have caught these before they reached staging.

### 2. Stricter TypeScript from the Start

We started with some `any` types to move fast. Every single one came back to haunt us. The time "saved" by skipping type definitions was repaid tenfold in debugging sessions where TypeScript couldn't help us.

### 3. Component-Level Error Boundaries Earlier

We added React error boundaries late. Before that, a single failed API call in a deeply nested component could crash the entire page. Error boundaries should be part of the initial architecture, not a retrofit.

### 4. Automated E2E Tests

With 12 service integrations, manual testing is a losing game. We should have invested in Playwright or Cypress E2E tests earlier — especially for critical flows like bundle purchase and SIM swap.

---

## The Numbers

- **~44,000** lines of TypeScript
- **12** backend service integrations
- **8** React Context providers
- **40+** custom hooks
- **100+** SVG icon components
- **40+** environment variables
- **3** caching layers
- **0** Redux boilerplate

---

## Final Thoughts

Building a frontend that aggregates a dozen microservices taught me that the hard problems aren't in the UI. They're in the **seams** — the boundaries between services, between cached and fresh data, between what the API promised and what it actually returned.

The patterns that saved us weren't clever abstractions. They were **boring, disciplined decisions**: isolate each service, sanitize everything, cache deliberately, observe relentlessly, and never trust a response shape you haven't validated.

If you're building something similar — a portal, a dashboard, an aggregation layer over microservices — I hope these lessons save you some of the scars we earned along the way.

---

*Yakubu Alhassan is a frontend engineer building enterprise telecom applications. He writes about the messy reality of shipping production software.*
