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

```typescript
type InputContext = 'general' | 'email' | 'tel' | 'password';

function sanitizeInput(value: string, context: InputContext): string {
  if (!value) return value;

  switch (context) {
    case 'tel':
      // Allowlist: only characters that belong in a phone number
      return value.replace(/[^\d+\-() ]/g, '');

    case 'email':
      // Allowlist: only characters that belong in an email address
      return value.replace(/[^\w.@+\-]/g, '');

    case 'password':
      // Passwords are never rendered as HTML — only strip null bytes
      return value.replace(/\0/g, '');

    case 'general':
    default:
      return sanitizeGeneralInput(value);
  }
}
```

The phone and email sanitizers use **allowlists** — they define what's permitted and reject everything else. This is fundamentally more secure than blocklists (trying to enumerate everything dangerous), because you can't bypass an allowlist with a novel encoding.

### The General Sanitizer: Where It Gets Hard

Free-text inputs can't use a simple allowlist without destroying legitimate user content. Here, we needed a blocklist approach — but a thorough one.

The general sanitizer runs in stages:

**Stage 1: Detect known XSS patterns**

```typescript
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /data\s*:[^,]*;base64/gi,
  /vbscript\s*:/gi,
  /on\w+\s*=/gi,  // Event handlers: onerror=, onload=, onclick=, etc.
];

function containsXSSPattern(value: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}
```

**Stage 2: Strip HTML tags — multiple passes**

This is where a single-pass approach fails. Consider this payload:

```
<scr<script>ipt>alert('xss')</scr</script>ipt>
```

A single pass of `/<[^>]*>/g` strips the inner `<script>` and `</script>` tags, but the remaining characters reassemble into `<script>alert('xss')</script>`. A second pass catches it.

We run the strip operation in a loop until the output stabilizes:

```typescript
function stripHTMLTags(value: string): string {
  let result = value;
  let previous = '';

  // Keep stripping until no more tags are found
  while (result !== previous) {
    previous = result;
    result = result.replace(/<[^>]*>/g, '');
  }

  return result;
}
```

**Stage 3: Character allowlist for high-risk fields**

For fields that will be rendered in the UI or sent to an API (not passwords), we apply a final character allowlist:

```typescript
// Allow word characters, whitespace, and common punctuation
const SAFE_CHARS = /[^\w\s\-.,!?()@#&:;'"\/]/g;
value = value.replace(SAFE_CHARS, '');
```

This is intentionally aggressive. If a complaint description gets slightly trimmed, that's acceptable. If an XSS payload gets through, it's not.

---

## Layer 2: Payload Sanitization at the API Boundary

Input-level sanitization relies on every component remembering to call `sanitizeInput()` on every field. In a codebase with 40+ custom hooks and dozens of forms, that's a bet you'll lose eventually.

So we added a second layer: **sanitize the entire request payload** before it leaves the browser.

```typescript
function sanitizePayload<T>(payload: T): T {
  // Base case: strings get sanitized
  if (typeof payload === 'string') {
    return sanitizeInput(payload, 'general') as unknown as T;
  }

  // Recurse into arrays
  if (Array.isArray(payload)) {
    return payload.map(item => sanitizePayload(item)) as unknown as T;
  }

  // Recurse into objects
  if (typeof payload === 'object' && payload !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      sanitized[key] = sanitizePayload(value);
    }
    return sanitized as T;
  }

  // Numbers, booleans, null — pass through
  return payload;
}
```

This function recursively walks any object tree — nested objects, arrays of objects, arrays of strings — and sanitizes every string value it finds.

We integrated this into the service layer so it runs automatically:

```typescript
class ApiService {
  async post<T>(endpoint: string, data: unknown, token: string): Promise<T> {
    const sanitizedData = sanitizePayload(data);
    const response = await axios.post(
      `${this.baseUrl}${endpoint}`,
      sanitizedData,
      { headers: this.buildHeaders(token) }
    );
    return response.data;
  }
}
```

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

```typescript
function generateSecureId(identifier: string): string {
  // One-way hash: you can't reverse it to get the phone number
  return cyrb53Hash(identifier + APPLICATION_SALT).toString(36);
}

// A fast, non-cryptographic hash suitable for identifiers (not security)
function cyrb53Hash(str: string, seed: number = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
```

Now the URL looks like `/accounts/k7f2m9x/details` — a meaningless string that maps stably to the same subscriber but reveals nothing about them.

**Important caveat**: this isn't cryptographic security. The hash is fast and deterministic, not resistant to brute force. If someone knows the hash algorithm and salt, they could enumerate phone numbers. But the threat model isn't "attacker with source code access" — it's "casual exposure in screenshots, logs, and shared browsers." For that threat model, hashing is the right tradeoff between privacy and performance.

### Mapping Hashes Back to Data

The frontend maintains an in-memory mapping from secure IDs to actual identifiers. This map lives only in JavaScript memory — not in storage, not in URLs, not in logs. When a component needs the real phone number (for an API call), it looks up the secure ID in the map.

```typescript
// In-memory only — never persisted to storage
const idMap = new Map<string, string>();

function registerIdentifier(raw: string): string {
  const secureId = generateSecureId(raw);
  idMap.set(secureId, raw);
  return secureId;
}

function resolveIdentifier(secureId: string): string | undefined {
  return idMap.get(secureId);
}
```

On logout, the map is cleared along with all other session data.

---

## Layer 4: Security Headers and Infrastructure

The final layer isn't in React at all — it's in the Nginx configuration and HTTP headers.

### Preventing Search Engine Indexing

An authenticated portal has no business appearing in Google results. We added:

```nginx
add_header X-Robots-Tag "noindex, noarchive, nosnippet" always;
```

This tells search engines: don't index this page, don't cache it, don't show snippets. The `always` directive ensures the header is sent even on error responses.

### Request Header Hardening

Every outbound API request includes:
- **Bearer token** — scoped to the specific audience the target service expects
- **Tenant identifier** — prevents one tenant's requests from accidentally routing to another tenant's data in multi-tenant backends
- **Content-Type** — always set explicitly, never relying on browser defaults

### Production Build Hardening

In the Vite build configuration, we strip anything that could help an attacker understand the application:

```typescript
// Production build config
{
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,     // Remove all console.* calls
      drop_debugger: true,    // Remove debugger statements
    },
  },
  sourcemap: false,           // No source maps in production
}
```

And in the application entry point:

```typescript
// Disable React DevTools in production
if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function () {};
}
```

This doesn't prevent a determined attacker — they can still read minified code. But it raises the effort bar and removes the low-hanging fruit of console logs leaking internal state.

---

## Testing the Sanitization System

Security code that isn't tested is decoration. We wrote tests that cover:

### Known XSS Payloads

```typescript
describe('sanitizeInput', () => {
  it('strips basic script tags', () => {
    expect(sanitizeInput('<script>alert("xss")</script>', 'general'))
      .not.toContain('<script>');
  });

  it('catches nested injection', () => {
    const nested = '<scr<script>ipt>alert("xss")</scr</script>ipt>';
    const result = sanitizeInput(nested, 'general');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
  });

  it('neutralizes event handlers', () => {
    expect(sanitizeInput('<img onerror="alert(1)">', 'general'))
      .not.toContain('onerror');
  });

  it('blocks javascript: URIs', () => {
    expect(sanitizeInput('javascript:alert(1)', 'general'))
      .not.toContain('javascript:');
  });
});
```

### Context-Specific Validation

```typescript
describe('phone sanitization', () => {
  it('preserves valid phone characters', () => {
    expect(sanitizeInput('+1 (555) 123-4567', 'tel'))
      .toBe('+1 (555) 123-4567');
  });

  it('strips everything else', () => {
    expect(sanitizeInput('+1<script>alert(1)</script>555', 'tel'))
      .toBe('+1()155');  // Only digits, +, (), spaces survive
  });
});
```

### Payload Recursion

```typescript
describe('sanitizePayload', () => {
  it('sanitizes deeply nested strings', () => {
    const payload = {
      user: {
        name: '<script>alert(1)</script>John',
        addresses: [
          { city: 'Accra<img onerror="hack()">' }
        ],
      },
    };

    const result = sanitizePayload(payload);
    expect(JSON.stringify(result)).not.toContain('<script>');
    expect(JSON.stringify(result)).not.toContain('onerror');
  });
});
```

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
