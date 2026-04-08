# Defending the Frontend: How We Built a Multi-Layer Sanitization System After a Security Scan

*A security audit flagged our telecom portal. Instead of patching holes, we built a defense system. Here's the architecture, the edge cases that surprised us, and why "just escape the HTML" is never enough.*

---

There's a moment in every project where security stops being a checkbox and starts being personal. For us, it was the day a penetration test report landed in our inbox with findings highlighted in red.

We were building a customer-facing portal for a major telecom provider — a React + TypeScript SPA that lets subscribers manage broadband accounts, file complaints, purchase bundles, and verify their identity. The app connects to 12+ backend microservices and handles sensitive data: phone numbers, national IDs, payment details, and personally identifiable subscriber information.

The security scan didn't find anything catastrophic. But it found *enough* — and what we built in response changed how I think about frontend security entirely.

---

## The Findings

The scan flagged three categories of risk:

1. **Input fields accepting unsanitized data** — complaint descriptions, device nicknames, and search inputs could potentially carry XSS payloads to the backend
2. **Sensitive identifiers exposed in URLs** — subscriber phone numbers (MSISDNs) visible in the address bar, session storage, and React DevTools
3. **Missing security headers** — the app could be indexed by search engines, and certain response headers weren't hardened

None of these were actively exploited. But in a portal handling millions of subscriber accounts, "not yet exploited" isn't a comforting status.

---

## Layer 1: Context-Aware Input Sanitization

The naive approach to sanitization is a single function that strips HTML tags from everything. We tried that first. It broke email inputs, mangled phone numbers, and still missed encoded payloads.

The insight was that **different input types have different threat models**:

- A **phone number field** should only contain digits, `+`, `-`, parentheses, and spaces. Anything else is suspicious by definition.
- An **email field** needs `@`, `.`, and alphanumeric characters. A `<script>` tag in an email field isn't a clever attack — it's obviously malicious.
- A **free-text field** (complaint descriptions, device nicknames) is where real XSS risk lives, because users legitimately type diverse characters.

So we built a context-aware sanitizer:

The sanitization function accepts two inputs: the raw value and a context indicator that specifies what kind of data is expected. Based on the context, it applies a different cleaning strategy. For telephone inputs, it uses an allowlist that permits only digits, plus signs, hyphens, parentheses, and spaces — stripping everything else. For email inputs, the allowlist permits alphanumeric characters, periods, the at symbol, plus signs, and hyphens. For password inputs, it performs only minimal cleaning (removing null bytes), since passwords are never rendered as markup. For general free-text inputs, it delegates to a more thorough multi-stage cleaning process described below.

The phone and email sanitizers use **allowlists** — they define what's permitted and reject everything else. This is fundamentally more secure than blocklists (trying to enumerate everything dangerous), because you can't bypass an allowlist with a novel encoding.

### The General Sanitizer: Where It Gets Hard

Free-text inputs can't use a simple allowlist without destroying legitimate user content. Here, we needed a blocklist approach — but a thorough one.

The general sanitizer runs in stages:

**Stage 1: Detect known XSS patterns**

The first stage checks the input against a list of known dangerous patterns. These patterns match script tag blocks (including those with content between opening and closing tags), protocol-based injection vectors such as inline scripting URIs and base64 data URIs, legacy scripting protocol references, and inline event handler attributes (the kind that trigger actions on error, load, click, and similar browser events). If any of these patterns are detected, the input is flagged for aggressive cleaning.

**Stage 2: Strip HTML tags — multiple passes**

This is where a single-pass approach fails. Consider this payload:

Consider a payload where script tags are nested inside each other — the inner tags are wrapped within fragments of outer tags. A single pass of tag removal strips the inner tags, but the remaining fragments reassemble into a valid, dangerous tag. A second pass catches that reassembled tag.

To handle this, the tag stripping operation runs in a loop. Each iteration removes all angle-bracket-delimited content. The loop continues until the output stabilizes — meaning a pass produces no changes, confirming that no further tags can be reconstructed from leftover fragments.

**Stage 3: Character allowlist for high-risk fields**

For fields that will be rendered in the UI or sent to an API (not passwords), we apply a final character allowlist:

For fields that will be rendered in the UI or transmitted to an API, a final character-level allowlist is applied. This allowlist permits word characters, whitespace, hyphens, common punctuation (periods, commas, exclamation marks, question marks, parentheses, at signs, hash symbols, ampersands, colons, semicolons, quotes), and forward slashes. Anything outside this set is removed.

This is intentionally aggressive. If a complaint description gets slightly trimmed, that's acceptable. If an XSS payload gets through, it's not.

---

## Layer 2: Payload Sanitization at the API Boundary

Input-level sanitization relies on every component remembering to call `sanitizeInput()` on every field. In a codebase with 40+ custom hooks and dozens of forms, that's a bet you'll lose eventually.

So we added a second layer: **sanitize the entire request payload** before it leaves the browser.

The payload sanitizer is a recursive function that processes any data structure. At the base case, if it encounters a string, it runs the general-context sanitization on it. If it encounters an array, it processes each element recursively. If it encounters an object, it iterates over every key-value pair and recursively sanitizes each value, constructing a cleaned copy of the object. Non-string primitives like numbers, booleans, and null values pass through unchanged.

This function recursively walks any object tree — nested objects, arrays of objects, arrays of strings — and sanitizes every string value it finds.

We integrated this into the service layer so it runs automatically:

We integrated this directly into the base service class so it runs automatically on every outbound request. Whenever any service method issues a POST request, the payload is passed through the recursive sanitizer before being sent over the network. The calling code does not need to remember to sanitize — it happens transparently at the service layer.

**The key insight**: this is defense-in-depth. Input sanitization is the first wall. Payload sanitization is the second. If an attacker finds a way to bypass one — maybe through a dynamically generated field that skips the form sanitizer — the payload sanitizer catches it at the exit.

### The "Forgot to Sanitize" Problem

Why does this matter? In a real codebase, new features get built fast. A developer adds a new form field, wires it to state, and submits it. They might forget to wrap the value in `sanitizeInput()`. Code review might miss it. The field goes to production unsanitized.

With payload-level sanitization, that forgotten field still gets cleaned before it reaches the API. The component-level sanitizer is the *preferred* defense (it's more context-aware), but the payload sanitizer is the *guaranteed* defense.

---

## Layer 3: Secure Identifier Generation

The security scan flagged that subscriber phone numbers appeared in multiple places:

- The browser URL (`/accounts/0241234567/details`)
- Session storage keys
- React component keys visible in DevTools
- Network request URLs logged in the console

Phone numbers are personally identifiable information. Exposing them in the browser creates privacy risks — especially on shared devices or when users share screenshots.

### The Hash-Based Solution

We replaced raw phone numbers with hash-based secure identifiers:

The secure identifier generator takes a raw identifier (such as a phone number), concatenates it with an application-specific salt, and feeds the result through a fast, non-cryptographic hash function. The hash function processes each character of the input through a series of mathematical mixing operations using large prime multipliers, producing a numeric output with good distribution properties. That numeric result is then converted to a compact base-36 string representation, yielding a short, opaque token like "k7f2m9x" that is stable (the same input always produces the same output) but not practically reversible to the original identifier.

Now the URL looks like `/accounts/k7f2m9x/details` — a meaningless string that maps stably to the same subscriber but reveals nothing about them.

**Important caveat**: this isn't cryptographic security. The hash is fast and deterministic, not resistant to brute force. If someone knows the hash algorithm and salt, they could enumerate phone numbers. But the threat model isn't "attacker with source code access" — it's "casual exposure in screenshots, logs, and shared browsers." For that threat model, hashing is the right tradeoff between privacy and performance.

### Mapping Hashes Back to Data

The frontend maintains an in-memory mapping from secure IDs to actual identifiers. This map lives only in JavaScript memory — not in storage, not in URLs, not in logs. When a component needs the real phone number (for an API call), it looks up the secure ID in the map.

The frontend maintains a lookup table in memory that maps each hashed identifier back to the original value. When a new identifier is encountered, it is hashed and the mapping is stored in this table. When a component needs the real identifier for an API call, it looks up the hash in the table. Crucially, this table exists only in runtime memory — it is never written to browser storage, URLs, or logs.

On logout, the map is cleared along with all other session data.

---

## Layer 4: Security Headers and Infrastructure

The final layer isn't in React at all — it's in the Nginx configuration and HTTP headers.

### Preventing Search Engine Indexing

An authenticated portal has no business appearing in Google results. We added:

At the web server level, we configured a response header that instructs search engines not to index the page, not to cache it, and not to display snippets from it. This directive is applied to all responses, including error pages.

This tells search engines: don't index this page, don't cache it, don't show snippets. The `always` directive ensures the header is sent even on error responses.

### Request Header Hardening

Every outbound API request includes:
- **Bearer token** — scoped to the specific audience the target service expects
- **Tenant identifier** — prevents one tenant's requests from accidentally routing to another tenant's data in multi-tenant backends
- **Content-Type** — always set explicitly, never relying on browser defaults

### Production Build Hardening

In the Vite build configuration, we strip anything that could help an attacker understand the application:

The production build pipeline is configured to aggressively minify all output using an advanced minifier. During compression, all console logging statements and debugger breakpoints are stripped entirely so they cannot leak internal state. Source maps are disabled in production builds, preventing attackers from easily reconstructing the original source structure.

Additionally, at the application entry point, we detect and neutralize browser developer tool hooks for the UI framework. This prevents casual inspection of the component tree and internal state through browser extensions in the production environment.

This doesn't prevent a determined attacker — they can still read minified code. But it raises the effort bar and removes the low-hanging fruit of console logs leaking internal state.

---

## Testing the Sanitization System

Security code that isn't tested is decoration. We wrote tests that cover:

### Known XSS Payloads

Our test suite for the general sanitizer verifies that it strips basic script tag injections, catches nested injection patterns where fragments reassemble into dangerous tags after a first cleaning pass, neutralizes inline event handler attributes embedded in markup, and blocks protocol-based injection URIs. Each test feeds a known attack payload into the sanitizer and asserts that no dangerous content survives in the output.

### Context-Specific Validation

For phone number sanitization, we test that legitimate phone formatting (digits, plus sign, parentheses, hyphens, spaces) is preserved intact, while injected markup is stripped down to only the characters that happen to fall within the phone allowlist. This confirms the allowlist approach works correctly even when attack content is mixed with valid data.

### Payload Recursion

The payload sanitizer tests verify that cleaning works at arbitrary nesting depth. We construct test objects with malicious strings buried inside nested objects and arrays, then confirm that after sanitization, no dangerous patterns survive anywhere in the serialized output. This ensures the recursive walk does not miss deeply nested values.

---

## The Philosophy: Defense in Depth

The security architecture follows a principle borrowed from military engineering: **defense in depth**. No single layer is expected to catch everything. Instead, each layer catches a different category of threat, and together they create overlapping coverage:

| Layer | What It Catches | Where It Runs |
|---|---|---|
| Input sanitization | Malicious input at the point of entry | Component level |
| Payload sanitization | Anything that bypassed input sanitization | Service layer |
| Secure IDs | PII exposure in URLs, storage, and logs | Routing & state |
| Security headers | Indexing, caching, and response-level leaks | Infrastructure |
| Build hardening | Debug tools and console leaks | Build pipeline |

If an attacker bypasses the input sanitizer (maybe through a dynamically generated field), the payload sanitizer catches it. If a developer forgets to use secure IDs in a new feature, the URL still doesn't appear in search engines because of the security headers. Each layer compensates for the others' blind spots.

---

## What We Learned

### 1. Security is an architecture decision, not a library choice

There is no `npm install security` that solves this. We evaluated DOMPurify, xss-filters, and other libraries. They're excellent for specific use cases (DOMPurify for rendering untrusted HTML, for instance). But our threat model required sanitization at multiple layers with different strategies at each — that's an architecture, not a dependency.

### 2. Allowlists beat blocklists

Every blocklist we wrote was immediately incomplete. There's always another encoding, another bypass, another edge case. Allowlists — "only these characters are permitted" — are inherently complete. If it's not on the list, it doesn't get through. We use allowlists wherever the input type permits them.

### 3. The "forgot to sanitize" problem is the real threat

Sophisticated XSS payloads aren't the primary risk in a well-maintained codebase. The primary risk is a developer adding a new form field and forgetting to sanitize it. The payload-level sanitizer exists specifically for this scenario — it's the safety net that catches human error.

### 4. Privacy and security overlap more than you'd think

We initially treated secure ID generation as a privacy feature, not a security feature. But preventing phone numbers from appearing in URLs also prevents them from leaking into server logs, browser history, and error tracking services. Privacy measures turned out to be some of our best security measures.

### 5. Test your sanitizers adversarially

Don't just test that `sanitizeInput` strips `<script>`. Test it with encoded payloads (`%3Cscript%3E`), nested payloads, null bytes, unicode tricks, and the actual attack strings from your penetration test report. Security tests should think like an attacker, not a developer.

---

## Closing Thoughts

The security scan that started this journey was uncomfortable. Nobody likes seeing red in a report about their code. But the system we built in response — context-aware sanitization, payload-level defense, secure identifiers, infrastructure hardening — made the application genuinely more robust.

More importantly, it changed how the team thinks about new features. "Where does this input go, and who sanitizes it?" is now a question we ask during code review, not after a security incident.

If your frontend handles sensitive data and you haven't done a security audit, I'd encourage you to pursue one. Not because your code is bad — but because the patterns you build in response will make it significantly better.

---

*Yakubu Alhassan is a frontend engineer who believes security is everyone's job — especially at the boundary between users and APIs.*
