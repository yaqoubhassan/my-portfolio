# Progressive Loading: Why We Stopped Showing Spinners and Started Showing Data

*How rethinking loading states in a multi-service telecom portal cut perceived load time in half — without changing a single API call.*

---

There's a screenshot burned into my memory. It's our broadband accounts page — a full-screen spinner, rotating endlessly, while eight separate API calls complete in sequence behind it. The page took 6 seconds to render. But it *felt* like 20, because the user saw nothing until everything was ready.

We were building a customer portal that aggregates data from 12+ backend microservices. A single page might need data from three or four of them. The easy pattern — show a spinner, fetch everything, render when done — was killing us. Not in performance metrics (the APIs were reasonably fast), but in *perceived performance* — the user's subjective experience of speed.

This is the story of how we replaced that full-screen spinner with a progressive loading system that shows data the instant it's available, loads the rest in the background, and handles the messy edge cases that make this harder than it sounds.

---

## The Problem: Sequential Loading in a Parallel World

Here's what the broadband page needs to display:

1. **Device list** — the user's paired broadband devices (names, identifiers, connection status)
2. **Balance data** — current data balance for each device
3. **Usage details** — breakdown of data consumption
4. **Account metadata** — nicknames, device types, plan information

The device list comes from one API. Balance data comes from another — and it's a **separate call per device**. A user with 8 paired devices means 1 + 8 = 9 API calls just to render the page fully.

Our initial implementation:

In our initial implementation, the page component set a loading flag to true on mount, then fetched the device list from one API. Once that returned, it issued balance requests for every device in parallel and waited for all of them to complete. Only after every single balance had been retrieved did it merge the results together, clear the loading flag, and render the page. Until that moment, the user saw nothing but a full-screen spinner.

The user experience: stare at a spinner for 3-6 seconds, then everything appears at once.

The `Promise.all` helps — balances load in parallel rather than sequentially. But we're still blocking the entire UI until the slowest balance API call completes. If one device's balance endpoint is having a bad day (and with 12 services, someone is always having a bad day), the entire page waits.

---

## The Solution: Render What You Have, Load What You Don't

The fix sounds obvious in retrospect: **render the device list immediately, then fill in balances as they arrive**.

The revised approach splits the work into two phases. In phase one, the component fetches only the device list and renders it immediately — showing device names, identifiers, and statuses. While this appears on screen, phase two begins in the background: the component iterates through the device list and fetches each device's balance independently. A set data structure tracks which devices currently have balance requests in flight.

For each device, the balance request is issued, and when it returns, only that specific device's entry in the list is updated with the new balance data. If a balance request fails, that individual device is marked with an error flag rather than crashing the entire page. After each request completes (success or failure), that device's identifier is removed from the loading set.

The rendering logic checks whether the initial device list is still loading (showing a skeleton placeholder if so), then maps over the device list to render individual cards. Each card receives a flag indicating whether its specific balance is still loading, determined by checking membership in the loading set.

The user experience now: device cards appear almost instantly (the list API is fast). Each card shows a small balance spinner that resolves independently. The user can start reading device names, checking statuses, and even interacting with cards while balances trickle in.

**Perceived load time dropped from 6 seconds to under 1 second** — not because the APIs got faster, but because the user saw meaningful content almost immediately.

---

## The Set\<string\> Pattern: Per-Item Loading State

The most reusable pattern from this work is using a `Set<string>` to track which items are loading:

We declare a piece of state that holds a set of strings, initialized as empty. Each string in the set represents the identifier of an item currently being fetched.

Compare this to the alternatives:

**Boolean flag** (`const [loading, setLoading] = useState(false)`) — can only represent "something is loading" or "nothing is loading." Useless when 8 items load independently.

**Object map** (`const [loading, setLoading] = useState<Record<string, boolean>>({})`) — works, but accumulates stale keys. After loading completes, you have `{ device1: false, device2: false, ... }` cluttering state.

**Set** — clean semantics. `loadingBalances.has(deviceId)` means "this device is loading." When loading finishes, `delete(deviceId)` removes it cleanly. An empty Set means nothing is loading — `loadingBalances.size === 0`.

We used this pattern everywhere:
- Balance loading per account
- Nickname saves per device
- Complaint status updates per ticket
- Bundle purchase processing per item

---

## Anti-Flicker: The 100ms Minimum Display Rule

Progressive loading introduced a new UX problem: **flicker**.

When a balance API responds in 50ms (cache hit, nearby CDN, fast backend), the loading spinner appears for a single frame, then vanishes. The user sees a brief flash — worse than no spinner at all, because it draws the eye to something that disappears before it can be read.

We implemented a minimum display duration for loading indicators:

We built a custom hook that wraps a boolean loading flag and ensures the loading indicator remains visible for at least a specified minimum duration (defaulting to 100 milliseconds). When loading begins, the hook immediately reports that the indicator should be shown and records the start time. When the underlying loading flag clears, the hook calculates how much time has elapsed. If the minimum duration has not yet been reached, it sets a timer to delay hiding the indicator by the remaining time. If the minimum has already passed, it hides the indicator immediately. The hook also cleans up any pending timers if the component unmounts.

In practice, each device card passes its loading flag through this hook. The card then conditionally renders either a balance spinner (if the minimum-duration flag says loading should be shown), an error state with a retry option (if the balance request failed), or the actual balance value (once loaded). This eliminates the single-frame flicker that would otherwise occur when a fast API response causes a spinner to flash and vanish before the user can perceive it.

**Why 100ms?** It's based on research into human perception thresholds. Anything under ~100ms is perceived as instantaneous — the spinner appears and disappears so fast the brain doesn't register a state change. Above 100ms, the user has time to recognize "this is loading" and then see it resolve, which feels smooth rather than glitchy.

---

## Skeleton Screens: The Perception Hack

For the initial page load (before any devices are available), we replaced the full-screen spinner with **skeleton screens** — gray placeholder shapes that mimic the layout of the real content:

The skeleton component renders a grid of placeholder cards that mimic the layout of real device cards. Each placeholder contains gray rectangular shapes that match the approximate dimensions of a device name, a subtitle, and a balance display area. A pulsing animation gives the user a visual cue that content is being loaded. We render three placeholder cards by default, which provides a sense of the page structure before any data has arrived.

Why skeletons over spinners?

**Spinners communicate uncertainty**: "something is happening, no idea when it'll finish."

**Skeletons communicate structure**: "here's what you're about to see, we're just filling in the details."

Research from Google and Facebook teams has shown that skeleton screens reduce *perceived* load time by up to 30% compared to spinners, even when actual load time is identical. The user's brain starts processing the layout before the data arrives, so when content appears, it feels like an update rather than an interruption.

We used skeletons for:
- Dashboard cards while metrics load
- Device lists while the account API responds
- Complaint tables while tickets are fetched

---

## Optimistic Updates: When Even Progressive Loading Isn't Fast Enough

Some interactions shouldn't wait for the server at all. When a user renames a broadband device, the rename should feel instant — even if the API takes 2 seconds.

**Optimistic updating** means updating the UI immediately with the expected result, then syncing with the server in the background:

The nickname update handler follows a five-step optimistic pattern. First, it immediately updates the device list in local state, replacing the old nickname with the new one so the UI reflects the change without delay. Second, it sets a flag indicating which device is currently being saved, which drives a subtle "Saving..." indicator. Third, it issues the actual API call to persist the change on the backend. If the API call succeeds, the saving indicator is simply cleared. If it fails, the handler reverts the device's nickname back to its previous value in local state and displays an error notification asking the user to try again. In all cases, the saving indicator is cleared at the end.

The UX flow:
1. User types a new nickname and hits save
2. The card immediately shows the new nickname
3. A subtle "Saving..." text appears (not a spinner — just text)
4. If the API succeeds, the saving indicator disappears quietly
5. If the API fails, the old nickname is restored and an error toast appears

The "Saving..." indicator only appears if the API takes longer than expected. For fast responses, the user sees the nickname update with no indication that anything happened in the background — which is exactly the right experience.

---

## Progress Tracking: When Background Loading Takes a While

For operations that involve multiple sequential steps (like loading balances for 10+ devices), we added progress tracking:

We built a reusable progressive loader hook that accepts a list of items and a function to load each one. It tracks how many items have been processed and the total count, deriving a percentage-based progress value. When invoked, it iterates through the list, calling the load function for each item. If any individual item fails, the error is logged but processing continues with the remaining items. After each item (success or failure), the completed counter increments. The hook exposes the progress percentage and a boolean indicating whether loading is still in progress.

This powers a subtle progress bar at the top of the page — a thin horizontal bar (just a few pixels tall) that fills from left to right as items complete. The fill width is driven by the progress percentage, and a smooth transition animation makes the increments feel fluid rather than jumpy. Once all items have loaded and progress reaches full completion, the bar disappears entirely.

The bar is intentionally minimal — 4 pixels tall, no text, no percentage. It communicates "we're still loading some data" without demanding attention. When all balances are loaded, it disappears.

---

## Error Recovery at the Card Level

Progressive loading means progressive error handling. When one balance call fails, it shouldn't affect the other seven cards.

Each device card component handles three distinct states on its own. If the device has a balance error flag set, the card renders the device name alongside an error message and a retry button that, when clicked, triggers a new balance fetch for that specific device. If the balance is still loading (indicated by the loading flag), the card shows the device name with a small spinner in the balance area. Otherwise, the card renders the device name and the actual balance value. This means a failed balance for one device is contained entirely within that card's display.

Each card independently handles its own error state. The user sees seven successful balances and one "Unable to load" message with a retry button — far better than a full-page error for a partial failure.

We paired this with **exponential backoff** for automatic retries in the service layer:

The retry utility wraps any asynchronous operation and attempts it up to a configurable maximum number of times (defaulting to three retries). On the first attempt, it runs immediately. If it fails and retries remain, it waits with a linearly increasing delay — one second before the second attempt, two seconds before the third, and three seconds before the fourth. If the final attempt still fails, the error is thrown up to the calling code. This pattern absorbs transient network hiccups and brief service outages without manual intervention.

The service layer retries automatically. Only if all retries fail does the error bubble up to the component.

---

## Memoization: Preventing Re-Render Cascades

Progressive loading means frequent state updates — each balance that arrives triggers a `setDevices` call. Without memoization, this can cause every card to re-render when a single balance arrives.

We memoize the sorted device list so that it is only recomputed when the underlying device data actually changes, not on every render cycle. Similarly, callback functions passed down to child components (such as the retry handler) are memoized so that they maintain a stable reference between renders, preventing unnecessary re-renders of the children that receive them.

We also wrapped the device card component in a memoization boundary. This means each card only re-renders when its own specific props change — not when a sibling card's data updates.

With this memoization, updating device #3's balance only re-renders card #3 — not all eight cards. Combined with the `Set<string>` loading pattern, each card's props change only when its own data changes.

---

## The Before and After

| Metric | Before (V1) | After (V2) |
|---|---|---|
| Time to first meaningful paint | 3-6 seconds | < 1 second |
| Time to full page render | 3-6 seconds | 3-6 seconds (unchanged) |
| Perceived load time (user feedback) | "slow" | "fast" |
| Impact of one slow API | Blocks entire page | Affects one card |
| Impact of one failed API | Full page error | One card shows retry |

The actual API performance didn't change. We didn't optimize a single backend call. The total time to load all data is identical. But the **user experience is unrecognizable** — because users don't measure speed in milliseconds. They measure it in "how long until I can do something useful."

---

## The Patterns, Summarized

1. **Render what you have**: don't block the entire UI waiting for the slowest data source
2. **Set\<string\> for per-item loading**: clean, scalable, no stale state
3. **Anti-flicker minimum duration**: 100ms prevents jarring visual transitions
4. **Skeleton screens over spinners**: communicate structure, not uncertainty
5. **Optimistic updates for user actions**: UI responds instantly, syncs in background
6. **Per-item error boundaries**: partial failures stay partial
7. **Memoize aggressively**: progressive updates cause frequent re-renders — contain the blast radius
8. **Progress bars for multi-item loads**: communicate activity without demanding attention

---

## When NOT to Use Progressive Loading

This pattern isn't free. It adds complexity — more state variables, more edge cases, more things to test. Use it when:

- A page depends on **multiple independent data sources**
- Some data sources are **significantly slower** than others
- Users can derive value from **partial data** (a device list without balances is still useful)
- **Failure of one source** shouldn't block the others

Don't use it when:
- All data comes from a **single API call** — just show a skeleton
- Data is **interdependent** — you can't render partial results meaningfully
- The total load time is **under 300ms** — the complexity isn't worth it

---

## Closing Thought

The biggest performance win in this project had nothing to do with algorithms, bundle size, or caching headers. It was a UX decision: **stop hiding content behind loading screens**.

Users don't need all the data to start being productive. They need *some* data and a clear signal that the rest is on its way. Progressive loading is how you deliver that.

---

*Yakubu Alhassan is a frontend engineer who thinks the best performance optimization is showing users their data sooner — even if "sooner" means "without all of it."*
