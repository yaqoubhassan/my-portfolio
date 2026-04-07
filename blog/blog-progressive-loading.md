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

```typescript
// V1: The blocking approach
function BroadbandPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEverything() {
      setLoading(true);
      const devices = await fetchDevices();
      const balances = await Promise.all(
        devices.map(d => fetchBalance(d.id))
      );
      setData(mergeDevicesWithBalances(devices, balances));
      setLoading(false);
    }
    loadEverything();
  }, []);

  if (loading) return <FullPageSpinner />;
  return <DeviceGrid data={data} />;
}
```

The user experience: stare at a spinner for 3-6 seconds, then everything appears at once.

The `Promise.all` helps — balances load in parallel rather than sequentially. But we're still blocking the entire UI until the slowest balance API call completes. If one device's balance endpoint is having a bad day (and with 12 services, someone is always having a bad day), the entire page waits.

---

## The Solution: Render What You Have, Load What You Don't

The fix sounds obvious in retrospect: **render the device list immediately, then fill in balances as they arrive**.

```typescript
// V2: Progressive loading
function BroadbandPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState<Set<string>>(new Set());

  // Step 1: Load device list
  useEffect(() => {
    async function loadDevices() {
      setLoadingDevices(true);
      const deviceList = await fetchDevices();
      setDevices(deviceList);
      setLoadingDevices(false);

      // Step 2: Load balances in background
      loadBalancesProgressively(deviceList);
    }
    loadDevices();
  }, []);

  // Load each balance independently — don't wait for others
  async function loadBalancesProgressively(deviceList: Device[]) {
    for (const device of deviceList) {
      // Mark this device's balance as loading
      setLoadingBalances(prev => new Set(prev).add(device.id));

      try {
        const balance = await fetchBalance(device.id);
        // Update just this device — others remain unchanged
        setDevices(prev =>
          prev.map(d => d.id === device.id ? { ...d, balance } : d)
        );
      } catch (error) {
        // Mark as failed — don't crash the whole page
        setDevices(prev =>
          prev.map(d => d.id === device.id ? { ...d, balanceError: true } : d)
        );
      } finally {
        // Clear loading state for this specific device
        setLoadingBalances(prev => {
          const next = new Set(prev);
          next.delete(device.id);
          return next;
        });
      }
    }
  }

  if (loadingDevices) return <DeviceListSkeleton />;

  return (
    <DeviceGrid>
      {devices.map(device => (
        <DeviceCard
          key={device.id}
          device={device}
          isLoadingBalance={loadingBalances.has(device.id)}
        />
      ))}
    </DeviceGrid>
  );
}
```

The user experience now: device cards appear almost instantly (the list API is fast). Each card shows a small balance spinner that resolves independently. The user can start reading device names, checking statuses, and even interacting with cards while balances trickle in.

**Perceived load time dropped from 6 seconds to under 1 second** — not because the APIs got faster, but because the user saw meaningful content almost immediately.

---

## The Set\<string\> Pattern: Per-Item Loading State

The most reusable pattern from this work is using a `Set<string>` to track which items are loading:

```typescript
const [loadingBalances, setLoadingBalances] = useState<Set<string>>(new Set());
```

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

```typescript
function useMinimumDuration(isLoading: boolean, minMs: number = 100): boolean {
  const [showLoading, setShowLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isLoading) {
      // Loading started — show indicator immediately
      setShowLoading(true);
      startTimeRef.current = Date.now();
    } else if (showLoading) {
      // Loading ended — ensure minimum display time
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, minMs - elapsed);

      if (remaining > 0) {
        timerRef.current = setTimeout(() => setShowLoading(false), remaining);
      } else {
        setShowLoading(false);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading]);

  return showLoading;
}
```

Usage:

```typescript
function DeviceCard({ device, isLoadingBalance }: Props) {
  // Show spinner for at least 100ms, even if the API responds instantly
  const showSpinner = useMinimumDuration(isLoadingBalance, 100);

  return (
    <div className="device-card">
      <h3>{device.name}</h3>
      {showSpinner ? (
        <BalanceSpinner />
      ) : device.balanceError ? (
        <BalanceError onRetry={() => retryBalance(device.id)} />
      ) : (
        <BalanceDisplay value={device.balance} />
      )}
    </div>
  );
}
```

**Why 100ms?** It's based on research into human perception thresholds. Anything under ~100ms is perceived as instantaneous — the spinner appears and disappears so fast the brain doesn't register a state change. Above 100ms, the user has time to recognize "this is loading" and then see it resolve, which feels smooth rather than glitchy.

---

## Skeleton Screens: The Perception Hack

For the initial page load (before any devices are available), we replaced the full-screen spinner with **skeleton screens** — gray placeholder shapes that mimic the layout of the real content:

```tsx
function DeviceListSkeleton() {
  return (
    <div className="device-grid">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="device-card animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-full" />
        </div>
      ))}
    </div>
  );
}
```

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

```typescript
async function handleNicknameUpdate(deviceId: string, newNickname: string) {
  // 1. Update UI immediately — don't wait for API
  setDevices(prev =>
    prev.map(d => d.id === deviceId ? { ...d, nickname: newNickname } : d)
  );

  // 2. Show a subtle saving indicator
  setSavingNickname(deviceId);

  try {
    // 3. Sync to backend
    await deviceService.updateNickname(deviceId, newNickname);
  } catch (error) {
    // 4. Revert on failure — restore the old nickname
    setDevices(prev =>
      prev.map(d => d.id === deviceId ? { ...d, nickname: d.previousNickname } : d)
    );
    showErrorToast('Failed to save nickname. Please try again.');
  } finally {
    // 5. Clear saving indicator
    setSavingNickname(null);
  }
}
```

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

```typescript
function useProgressiveLoader<T>(
  items: T[],
  loadItem: (item: T) => Promise<void>
) {
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  async function loadAll(itemList: T[]) {
    setTotal(itemList.length);
    setCompleted(0);

    for (const item of itemList) {
      try {
        await loadItem(item);
      } catch {
        // Log but don't stop — continue loading remaining items
      }
      setCompleted(prev => prev + 1);
    }
  }

  return { loadAll, progress, isLoading: completed < total && total > 0 };
}
```

This powers a subtle progress bar at the top of the page:

```tsx
function BalanceProgressBar({ progress }: { progress: number }) {
  if (progress >= 100) return null;

  return (
    <div className="h-1 w-full bg-gray-100 rounded overflow-hidden">
      <div
        className="h-full bg-blue-500 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
```

The bar is intentionally minimal — 4 pixels tall, no text, no percentage. It communicates "we're still loading some data" without demanding attention. When all balances are loaded, it disappears.

---

## Error Recovery at the Card Level

Progressive loading means progressive error handling. When one balance call fails, it shouldn't affect the other seven cards.

```tsx
function DeviceCard({ device, isLoadingBalance, onRetry }: Props) {
  if (device.balanceError) {
    return (
      <div className="device-card">
        <h3>{device.name}</h3>
        <div className="text-red-500 text-sm">
          Unable to load balance
          <button
            onClick={() => onRetry(device.id)}
            className="ml-2 text-blue-500 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="device-card">
      <h3>{device.name}</h3>
      {isLoadingBalance ? (
        <BalanceSpinner />
      ) : (
        <BalanceDisplay value={device.balance} />
      )}
    </div>
  );
}
```

Each card independently handles its own error state. The user sees seven successful balances and one "Unable to load" message with a retry button — far better than a full-page error for a partial failure.

We paired this with **exponential backoff** for automatic retries in the service layer:

```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Exponential backoff: 1s, 2s, 3s
      const delay = (attempt + 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}
```

The service layer retries automatically. Only if all retries fail does the error bubble up to the component.

---

## Memoization: Preventing Re-Render Cascades

Progressive loading means frequent state updates — each balance that arrives triggers a `setDevices` call. Without memoization, this can cause every card to re-render when a single balance arrives.

```typescript
// Memoize the device list to prevent unnecessary re-renders
const sortedDevices = useMemo(
  () => devices.sort((a, b) => a.name.localeCompare(b.name)),
  [devices]
);

// Memoize callbacks passed to child components
const handleRetry = useCallback(
  (deviceId: string) => retryBalance(deviceId),
  [retryBalance]
);
```

We also made `DeviceCard` a memoized component:

```typescript
const DeviceCard = React.memo(function DeviceCard({ device, isLoadingBalance, onRetry }: Props) {
  // Only re-renders when THIS device's data changes
  // ...
});
```

With `React.memo`, updating device #3's balance only re-renders card #3 — not all eight cards. Combined with the `Set<string>` loading pattern, each card's props change only when its own data changes.

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
