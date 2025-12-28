# Implementation Plan: Three Feature Additions

This document outlines the implementation plan for three new features:
1. Persist Panel Sizes
2. Command Auto-completion in CLI
3. Pub/Sub Monitor

---

## Feature 1: Persist Panel Sizes

### Overview
Make resizable panel dimensions persistent across app sessions by saving them to localStorage. Currently, panel sizes reset to defaults on every app restart.

### Current State
- Two resizable panels exist: KeyBrowser (horizontal) and CLI Panel (vertical)
- `useResize` hook manages resize logic with state only
- Sizes reset to defaults: KeyBrowser=320px, CLI Panel=256px
- `onResize` callback exists but not utilized

### Implementation Strategy

#### Option A: Encapsulated in Hook (Recommended)
Update `useResize` hook to automatically handle persistence when a `persistKey` is provided.

**Files to Modify:**
1. `/src/hooks/useResize.ts`
2. `/src/App.tsx`

**Changes:**

**1. Update useResize.ts:**
```typescript
interface UseResizeOptions {
  initialSize: number;
  minSize: number;
  maxSize: number;
  direction: "horizontal" | "vertical";
  onResize?: (size: number) => void;
  persistKey?: string; // NEW: Optional localStorage key
}

export function useResize({
  initialSize,
  minSize,
  maxSize,
  direction,
  onResize,
  persistKey, // NEW
}: UseResizeOptions) {
  // Load initial size from localStorage if persistKey exists
  const getInitialSize = () => {
    if (persistKey) {
      const stored = localStorage.getItem(persistKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= minSize && parsed <= maxSize) {
          return parsed;
        }
      }
    }
    return initialSize;
  };

  const [size, setSize] = useState(getInitialSize);
  // ... rest of hook logic

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // ... existing logic
      setSize(newSize);
      onResize?.(newSize);
      
      // NEW: Persist to localStorage if key provided
      if (persistKey) {
        localStorage.setItem(persistKey, newSize.toString());
      }
    },
    [isResizing, direction, minSize, maxSize, onResize, persistKey]
  );

  // ... rest of hook
}
```

**2. Update App.tsx:**
```typescript
const keyBrowserResize = useResize({
  initialSize: 320,
  minSize: 250,
  maxSize: 600,
  direction: "horizontal",
  persistKey: "redistal-keybrowser-width", // NEW
});

const cliPanelResize = useResize({
  initialSize: 256,
  minSize: 150,
  maxSize: 500,
  direction: "vertical",
  persistKey: "redistal-clipanel-height", // NEW
});
```

### Storage Keys
- `redistal-keybrowser-width` - KeyBrowser panel width in pixels
- `redistal-clipanel-height` - CLI panel height in pixels

Following existing pattern from theme storage: `redistal-theme`, `redistal-accent-color`

### Edge Cases to Handle
1. Invalid stored values (non-numeric, out of range) → Fall back to `initialSize`
2. localStorage not available → Graceful degradation to in-memory only
3. Min/max constraints changed after storage → Clamp to new bounds

### Testing Steps
1. Resize KeyBrowser to 450px → Refresh → Should remain 450px
2. Resize CLI Panel to 200px → Refresh → Should remain 200px
3. Clear localStorage → Refresh → Should reset to defaults (320px, 256px)
4. Manually set invalid value in localStorage → Should clamp to valid range

### Effort Estimate
- **Time:** 15-20 minutes
- **Complexity:** Low
- **Files Changed:** 2
- **Lines of Code:** ~25 new lines

---

## Feature 2: Command Auto-completion in CLI

### Overview
Add intelligent auto-completion to the CLI panel's command input. Show suggestions as user types, support Tab/Enter to complete, provide command syntax hints.

### Current State
- Simple text input with no suggestions
- Command parsing is basic (whitespace split)
- No command reference database exists
- History navigation works (↑/↓ arrows)
- Command highlighting exists for display only

### Implementation Strategy

#### Phase 1: Command Reference Database

**1. Create Redis command database:**
`/src/lib/redis-commands.ts`
```typescript
interface RedisCommand {
  name: string;
  summary: string;
  syntax: string;
  group: string; // "string" | "hash" | "list" | "set" | "zset" | "stream" | "generic" | "server" | "connection" | "pubsub"
  since: string;
  complexity?: string;
  args?: RedisCommandArg[];
}

interface RedisCommandArg {
  name: string;
  type: "string" | "integer" | "double" | "key" | "pattern";
  optional?: boolean;
  multiple?: boolean;
}

export const REDIS_COMMANDS: RedisCommand[] = [
  {
    name: "GET",
    summary: "Get the value of a key",
    syntax: "GET key",
    group: "string",
    since: "1.0.0",
    complexity: "O(1)",
    args: [{ name: "key", type: "key" }]
  },
  {
    name: "SET",
    summary: "Set the string value of a key",
    syntax: "SET key value [EX seconds|PX milliseconds|EXAT unix-time-seconds|PXAT unix-time-milliseconds|KEEPTTL] [NX|XX] [GET]",
    group: "string",
    since: "1.0.0",
    args: [
      { name: "key", type: "key" },
      { name: "value", type: "string" },
      { name: "EX", type: "integer", optional: true },
      // ... additional args
    ]
  },
  // ... ~200+ core Redis commands
];

// Helper functions
export function getCommandSuggestions(partial: string): RedisCommand[] {
  const upper = partial.toUpperCase();
  return REDIS_COMMANDS.filter(cmd => 
    cmd.name.startsWith(upper)
  ).slice(0, 10); // Limit to 10 suggestions
}

export function getCommand(name: string): RedisCommand | undefined {
  return REDIS_COMMANDS.find(cmd => 
    cmd.name === name.toUpperCase()
  );
}
```

**Note:** Can source command data from official Redis documentation or use a curated subset (~50-100 most common commands initially, expand later).

#### Phase 2: Suggestion Dropdown Component

**2. Create autocomplete component:**
`/src/components/CommandSuggestions.tsx`
```typescript
interface CommandSuggestionsProps {
  suggestions: RedisCommand[];
  selectedIndex: number;
  onSelect: (command: RedisCommand) => void;
  position: { top: number; left: number };
}

export function CommandSuggestions({
  suggestions,
  selectedIndex,
  onSelect,
  position,
}: CommandSuggestionsProps) {
  return (
    <div
      className="absolute z-50 w-96 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {suggestions.map((cmd, index) => (
        <button
          key={cmd.name}
          onClick={() => onSelect(cmd)}
          className={clsx(
            "w-full text-left px-3 py-2 hover:bg-neutral-800 border-b border-neutral-800 last:border-b-0",
            selectedIndex === index && "bg-neutral-800"
          )}
        >
          <div className="font-mono text-sm text-brand-400">{cmd.name}</div>
          <div className="text-xs text-neutral-400 truncate">{cmd.summary}</div>
          <div className="text-xs text-neutral-500 font-mono mt-1">{cmd.syntax}</div>
        </button>
      ))}
    </div>
  );
}
```

#### Phase 3: Integrate into CliPanel

**3. Update CliPanel.tsx:**

**State additions:**
```typescript
const [suggestions, setSuggestions] = useState<RedisCommand[]>([]);
const [showSuggestions, setShowSuggestions] = useState(false);
const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
```

**Input change handler:**
```typescript
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setCommand(value);
  
  // Get first word (command name)
  const firstWord = value.trim().split(/\s+/)[0];
  
  if (firstWord && value === firstWord) { // Only suggest for first word
    const matches = getCommandSuggestions(firstWord);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
    setSelectedSuggestionIndex(0);
  } else {
    setShowSuggestions(false);
  }
};
```

**Keyboard navigation:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (showSuggestions) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => 
        Math.min(suggestions.length - 1, prev + 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === "Tab" || e.key === "Enter") {
      if (suggestions.length > 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  } else {
    // Existing history navigation for up/down arrows
    if (e.key === "ArrowUp") {
      // ... existing history logic
    }
  }
};
```

**Selection handler:**
```typescript
const handleSelectSuggestion = (cmd: RedisCommand) => {
  setCommand(cmd.name + " ");
  setShowSuggestions(false);
  inputRef.current?.focus();
  // Move cursor to end
  setTimeout(() => {
    if (inputRef.current) {
      inputRef.current.selectionStart = inputRef.current.value.length;
      inputRef.current.selectionEnd = inputRef.current.value.length;
    }
  }, 0);
};
```

**Render suggestions:**
```typescript
<div className="relative">
  <input
    ref={inputRef}
    value={command}
    onChange={handleInputChange}
    onKeyDown={handleKeyDown}
    // ... existing props
  />
  {showSuggestions && suggestions.length > 0 && (
    <CommandSuggestions
      suggestions={suggestions}
      selectedIndex={selectedSuggestionIndex}
      onSelect={handleSelectSuggestion}
      position={{ top: 40, left: 0 }} // Adjust based on input position
    />
  )}
</div>
```

#### Phase 4: Command Syntax Hints

**4. Optional enhancement - Show syntax hint below input:**
```typescript
{command.trim() && !showSuggestions && (
  <div className="px-3 py-1 text-xs text-neutral-500 font-mono border-t border-neutral-800">
    {(() => {
      const firstWord = command.trim().split(/\s+/)[0];
      const cmd = getCommand(firstWord);
      return cmd ? cmd.syntax : null;
    })()}
  </div>
)}
```

### Command Database Scope

**Initial implementation (50 essential commands):**
- String: GET, SET, SETEX, APPEND, INCR, DECR, DEL, EXISTS, TTL, EXPIRE
- Hash: HGET, HSET, HMGET, HMSET, HGETALL, HDEL, HKEYS, HVALS
- List: LPUSH, RPUSH, LPOP, RPOP, LRANGE, LLEN, LINDEX, LSET
- Set: SADD, SREM, SMEMBERS, SISMEMBER, SCARD, SUNION
- ZSet: ZADD, ZREM, ZRANGE, ZREVRANGE, ZSCORE, ZCARD
- Generic: KEYS, SCAN, TYPE, RENAME, DUMP, RESTORE
- Server: INFO, PING, FLUSHDB, FLUSHALL, DBSIZE, CLIENT, SLOWLOG
- Connection: AUTH, SELECT, QUIT
- Pub/Sub: PUBLISH, SUBSCRIBE, PSUBSCRIBE, UNSUBSCRIBE

**Future expansion:**
- Add all ~200 core Redis commands
- Include module commands (RedisJSON, RedisSearch, etc.)
- Add subcommand support (e.g., "CLIENT LIST", "CLUSTER NODES")

### Edge Cases
1. Multiple words typed → Only suggest on first word
2. Space after command → Hide suggestions, show syntax hint
3. Case-insensitive matching → Convert to uppercase
4. Click outside dropdown → Close suggestions
5. Fast typing → Debounce suggestion updates? (Optional)

### Testing Steps
1. Type "G" → Should show GET, GETRANGE, GETSET, etc.
2. Arrow down → Should highlight next suggestion
3. Tab/Enter → Should complete command with space
4. Type "GET " → Should hide suggestions, show syntax hint
5. Type "SET k" → Should not show suggestions (second word)
6. Escape → Should close suggestions

### Effort Estimate
- **Time:** 2-3 hours
- **Complexity:** Medium
- **Files Changed:** 3 new, 1 modified
- **Lines of Code:** ~400-500 new lines
  - redis-commands.ts: ~250-300 lines (command data)
  - CommandSuggestions.tsx: ~60 lines
  - CliPanel.tsx: ~100 lines (integration)

---

## Feature 3: Pub/Sub Monitor

### Overview
Add real-time Pub/Sub monitoring to the monitoring dashboard. Allow users to view active channels, subscriber counts, and optionally subscribe to channels to view messages in real-time.

### Current State
- MonitoringPanel has 5 tabs: Overview, Clients, Slow Log, Commands, Memory
- Monitoring commands use polling with `setInterval` (3-5s refresh)
- No Pub/Sub functionality exists
- No streaming/persistent connection mechanism for real-time messages

### Implementation Strategy

#### Phase 1: Passive Monitoring (Statistics Only)

**Scope:** Display channel statistics without subscribing to messages.

**1. Backend - Add Tauri Commands:**
`/src-tauri/src/commands.rs`

**New structs:**
```rust
#[derive(Debug, Serialize, Clone)]
pub struct PubSubChannel {
    pub name: String,
    pub subscribers: i32,
}

#[derive(Debug, Serialize, Clone)]
pub struct PubSubStats {
    pub channels: Vec<PubSubChannel>,
    pub pattern_subscribers: i32,
}
```

**New command:**
```rust
#[tauri::command]
pub async fn get_pubsub_stats(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<PubSubStats, String> {
    let manager = state.manager.lock().await;
    let client = manager
        .get_client(&connection_id)
        .ok_or("Connection not found")?;
    let mut conn = client.get_multiplexed_async_connection()
        .await
        .map_err(|e| e.to_string())?;

    // Get all active channels
    let channels: Vec<String> = redis::cmd("PUBSUB")
        .arg("CHANNELS")
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    // Get subscriber count for each channel
    let mut channel_stats = Vec::new();
    for channel in channels {
        let numsub_result: Vec<redis::Value> = redis::cmd("PUBSUB")
            .arg("NUMSUB")
            .arg(&channel)
            .query_async(&mut conn)
            .await
            .map_err(|e| e.to_string())?;

        // Parse NUMSUB result: [channel_name, subscriber_count, ...]
        let subscribers = if numsub_result.len() >= 2 {
            match &numsub_result[1] {
                redis::Value::Int(count) => *count as i32,
                _ => 0,
            }
        } else {
            0
        };

        channel_stats.push(PubSubChannel {
            name: channel,
            subscribers,
        });
    }

    // Get pattern subscriber count
    let numpat: i32 = redis::cmd("PUBSUB")
        .arg("NUMPAT")
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(PubSubStats {
        channels: channel_stats,
        pattern_subscribers: numpat,
    })
}
```

**2. Frontend - Add Type Definitions:**
`/src/types/redis.ts`
```typescript
export interface PubSubChannel {
  name: string;
  subscribers: number;
}

export interface PubSubStats {
  channels: PubSubChannel[];
  pattern_subscribers: number;
}
```

**3. Frontend - Add Tauri API Wrapper:**
`/src/lib/tauri-api.ts`
```typescript
async getPubSubStats(connectionId: string): Promise<PubSubStats> {
  return await invoke("get_pubsub_stats", { connectionId });
}
```

**4. Frontend - Create PubSubMonitor Component:**
`/src/components/PubSubMonitor.tsx`
```typescript
import { useState, useEffect } from "react";
import { Radio, Users, Hash } from "lucide-react";
import { redisApi } from "../lib/tauri-api";
import { Card } from "./ui";
import type { PubSubStats } from "../types/redis";

interface PubSubMonitorProps {
  connectionId: string;
}

export function PubSubMonitor({ connectionId }: PubSubMonitorProps) {
  const [stats, setStats] = useState<PubSubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setError(null);
      const data = await redisApi.getPubSubStats(connectionId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Pub/Sub stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 3000); // 3s refresh
    return () => clearInterval(interval);
  }, [connectionId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading Pub/Sub stats...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-error-400">{error}</div>;
  }

  if (!stats) return null;

  const totalChannels = stats.channels.length;
  const totalSubscribers = stats.channels.reduce((sum, ch) => sum + ch.subscribers, 0);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-lg">
              <Hash className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-100">{totalChannels}</div>
              <div className="text-sm text-neutral-400">Active Channels</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info-500/10 rounded-lg">
              <Users className="w-5 h-5 text-info-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-100">{totalSubscribers}</div>
              <div className="text-sm text-neutral-400">Total Subscribers</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-500/10 rounded-lg">
              <Radio className="w-5 h-5 text-warning-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-100">{stats.pattern_subscribers}</div>
              <div className="text-sm text-neutral-400">Pattern Subscribers</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Channel List Table */}
      <Card>
        <div className="p-4 border-b border-neutral-800">
          <h3 className="font-semibold text-neutral-100">Channels</h3>
        </div>
        <div className="overflow-auto max-h-96">
          {totalChannels === 0 ? (
            <div className="p-8 text-center text-neutral-400">
              No active channels
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-neutral-900 sticky top-0">
                <tr className="text-left text-xs text-neutral-400 border-b border-neutral-800">
                  <th className="p-3 font-medium">Channel Name</th>
                  <th className="p-3 font-medium text-right">Subscribers</th>
                </tr>
              </thead>
              <tbody>
                {stats.channels.map((channel, index) => (
                  <tr
                    key={index}
                    className="border-b border-neutral-800 hover:bg-neutral-900/50"
                  >
                    <td className="p-3 font-mono text-sm text-neutral-200">
                      {channel.name}
                    </td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-1 bg-info-500/10 text-info-400 rounded text-sm">
                        {channel.subscribers}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
```

**5. Frontend - Integrate into MonitoringPanel:**
`/src/components/MonitoringPanel.tsx`

**Add tab:**
```typescript
const tabs = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "clients", label: "Clients", icon: Users },
  { id: "slowlog", label: "Slow Log", icon: Clock },
  { id: "commands", label: "Commands", icon: BarChart },
  { id: "memory", label: "Memory", icon: Database },
  { id: "pubsub", label: "Pub/Sub", icon: Radio }, // NEW
];
```

**Add content panel:**
```typescript
{activeTab === "pubsub" && <PubSubMonitor connectionId={connectionId} />}
```

#### Phase 2: Active Monitoring (Real-time Message Capture)

**Scope:** Subscribe to channels and display messages in real-time.

**Complexity:** HIGH - Requires persistent subscriber connection, message streaming, UI updates.

**Recommended Approach:**
- Use separate Redis connection for subscription (SUBSCRIBE is blocking)
- Stream messages via Tauri events (emit from Rust to frontend)
- Add subscribe/unsubscribe controls in UI
- Display message history with timestamps

**Deferred to Future:** This phase is significantly more complex and should be a separate feature after Phase 1 is validated.

### Edge Cases
1. No active channels → Show empty state
2. Channel list changes during refresh → Handle gracefully
3. Connection lost during polling → Show error state
4. Very large channel list (100+) → Consider pagination or virtual scrolling

### Testing Steps
1. Open monitoring panel → Navigate to Pub/Sub tab
2. Without active channels → Should show "No active channels"
3. Publish to channel from CLI → Should appear in channel list within 3 seconds
4. Subscribe to channel from CLI → Subscriber count should increment
5. Multiple subscribers → Count should reflect accurate total
6. Switch connections → Stats should refresh for new connection

### Effort Estimate
**Phase 1 (Passive Monitoring):**
- **Time:** 1.5-2 hours
- **Complexity:** Medium
- **Files Changed:** 5 (1 Rust, 4 TypeScript)
- **Lines of Code:** ~250 new lines
  - Rust (commands.rs): ~80 lines
  - Types (redis.ts): ~10 lines
  - API wrapper (tauri-api.ts): ~5 lines
  - Component (PubSubMonitor.tsx): ~130 lines
  - Integration (MonitoringPanel.tsx): ~25 lines

**Phase 2 (Active Monitoring):**
- **Time:** 4-6 hours
- **Complexity:** High
- **Deferred:** Implement after Phase 1 validation

---

## Implementation Order

### Session 1: Quick Win (20 minutes)
1. **Persist Panel Sizes** - Low complexity, immediate value

### Session 2: CLI Enhancement (2-3 hours)
2. **Command Auto-completion** - Medium complexity, high productivity impact
   - Start with 50 essential commands
   - Can expand database incrementally

### Session 3: Monitoring Extension (2 hours)
3. **Pub/Sub Monitor (Phase 1)** - Medium complexity, completes monitoring suite
   - Passive monitoring only (statistics)
   - Active monitoring (message capture) can be future enhancement

### Total Effort
- **Combined Time:** 4.5-5.5 hours
- **Risk Level:** Low-Medium
- **Dependencies:** None (features are independent)

---

## Success Criteria

### Persist Panel Sizes
- [ ] Panel widths/heights persist across app restarts
- [ ] Invalid stored values fall back to defaults gracefully
- [ ] No performance impact from localStorage reads/writes

### Command Auto-completion
- [ ] Typing partial command shows relevant suggestions
- [ ] Tab/Enter completes selected command
- [ ] Arrow keys navigate suggestions
- [ ] Syntax hints display after command completion
- [ ] No interference with existing history navigation

### Pub/Sub Monitor
- [ ] Active channels display with subscriber counts
- [ ] Stats refresh every 3 seconds automatically
- [ ] Empty state shows when no channels active
- [ ] Pattern subscriber count displays accurately
- [ ] Table sorts/displays channels clearly

---

## Future Enhancements

### Persist Panel Sizes
- Add "Reset to Default" action in settings
- Persist collapsed/expanded state of panels

### Command Auto-completion
- Expand to full 200+ command database
- Add subcommand support (CLIENT LIST, CLUSTER NODES, etc.)
- Fuzzy matching for typos
- Parameter auto-completion (key names, field names)
- Command history search/filter

### Pub/Sub Monitor
- **Phase 2:** Real-time message capture
- Message filtering and search
- Export message history
- Pattern subscription monitoring
- Subscribe/unsubscribe from UI
- Message publishing from monitoring panel
