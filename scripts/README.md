# Redis Test Scripts

These scripts help you populate your Redis database with comprehensive test data and clean it up when needed.

## Installation

First, install the dependencies for the scripts:

```bash
cd scripts
npm install
```

## Scripts

### 1. Populate Redis (`populate-redis.js`)

Creates **~15,000 test keys** covering all Redis data types with various edge cases.

**Usage:**
```bash
# From project root
npm run test:populate

# Or from scripts directory
node populate-redis.js [redis-url]

# Examples
node populate-redis.js redis://localhost:6379
node populate-redis.js redis://:password@localhost:6379
node populate-redis.js rediss://localhost:6380  # TLS
```

**What it creates:**

- **Strings** (~1,000+)
  - Simple strings
  - Large values (100KB)
  - Very large values (512KB)
  - JSON strings
  - Unicode strings (emoji, Chinese, Arabic, Russian)
  - Empty strings
  - Special characters (newlines, tabs, HTML, SQL, XML)

- **Lists** (~400+)
  - Small lists (5-20 items)
  - Large lists (1,000 items)
  - Very large list (10,000 items)
  - Lists with JSON items
  - Empty lists

- **Sets** (~400+)
  - Small sets (10-50 members)
  - Large sets (1,000 members)
  - Sets with numbers
  - Sets with Unicode

- **Sorted Sets** (~450+)
  - Small sorted sets
  - Leaderboard-style (high scores)
  - Timestamp-based (event timelines)
  - Large sorted sets (1,000 members)
  - Negative scores
  - Float scores with high precision

- **Hashes** (~1,100+)
  - User profiles (500+)
  - Product catalogs (200+)
  - Small hashes (3-10 fields)
  - Large hashes (500 fields)
  - Hashes with JSON values

- **TTL Keys** (~250+)
  - Short TTL (10s-60s)
  - Medium TTL (1h-24h)
  - Long TTL (1d-7d)
  - TTL on different data types

- **Namespace Patterns** (~1,200+)
  - `app:production:cache:*`
  - `app:staging:cache:*`
  - `user:preferences:*`
  - `analytics:pageview:*`
  - `queue:high:priority:*`
  - And many more...

- **Stress Test Keys** (~11,000+)
  - Mixed data types to reach 15k total keys
  - Tests SCAN performance

- **Edge Cases** (~60+)
  - Very long key names (1000+ chars)
  - Special Redis characters in key names
  - Keys that look like patterns (`*`, `?`, `[abc]`)
  - Numeric-only keys
  - Keys with leading/trailing colons

### 2. Cleanup Redis (`cleanup-redis.js`)

Removes test data with multiple cleanup modes.

**Usage:**
```bash
# From project root
npm run test:cleanup              # Deletes only test data (safe)
npm run test:cleanup:all          # Deletes ALL keys (dangerous!)

# Or from scripts directory
node cleanup-redis.js [redis-url] [mode]

# Examples
node cleanup-redis.js redis://localhost:6379 test      # Default: remove only test keys
node cleanup-redis.js redis://localhost:6379 all       # FLUSHDB - delete everything
node cleanup-redis.js redis://localhost:6379 pattern   # Delete by custom pattern
```

**Modes:**

- **`test`** (default) - Safely deletes only test data created by populate-redis.js
- **`all`** - Deletes ALL keys using FLUSHDB (requires confirmation)
- **`pattern`** - Delete keys matching a custom pattern (will prompt for pattern)

**Safety Features:**
- Confirmation prompts before deletion
- Shows preview of keys to be deleted
- Statistics before and after cleanup
- Batch deletion for better performance

## Testing Scenarios

After populating, test these features in Redistal:

### Performance Testing
1. **SCAN Performance**: With 15k keys, test the key browser's SCAN implementation
2. **Pattern Matching**: Search for patterns like `user:*`, `cache:*`, `stress:*`
3. **Large Values**: Open `string:verylarge:*` keys to test value viewer performance
4. **Large Collections**: View `list:verylarge:mega` (10,000 items)

### Data Type Testing
1. **String Viewer**: 
   - View JSON strings (`string:json:*`)
   - Test Unicode rendering (`string:unicode:*`)
   - Check special character handling (`string:special:*`)

2. **List Viewer**:
   - Small lists with pagination
   - Large lists (test scrolling/virtualization)
   - JSON items in lists

3. **Set Viewer**:
   - Member display
   - Search within members

4. **Sorted Set Viewer**:
   - Score display
   - Sorting by score/member
   - Different score types (negative, float, timestamp)

5. **Hash Viewer**:
   - Field browsing
   - Large hashes with 500 fields
   - JSON values in hash fields

### TTL Testing
1. Watch TTL countdown on `ttl:short:*` keys (10-60 seconds)
2. Check TTL display formatting for different ranges
3. Verify TTL on different data types

### Edge Cases
1. Long key names (`edge:` + 1000 chars)
2. Special characters in key names
3. Numeric-only keys
4. Pattern-like keys (`edge:pattern:*`)

### UI/UX Testing
1. Scrolling performance with 15k keys
2. Search/filter responsiveness
3. Memory usage with large values
4. Copy/paste functionality
5. Error handling for expired keys

## Examples

```bash
# Full workflow
cd scripts
npm install

# Populate Redis with test data
node populate-redis.js redis://localhost:6379

# Test your app...

# Clean up when done
node cleanup-redis.js redis://localhost:6379 test

# Or delete everything
node cleanup-redis.js redis://localhost:6379 all
```

## Tips

- Start with a clean database for consistent testing
- Run cleanup between test iterations
- Use `test` mode for safe cleanup (preserves non-test keys)
- Monitor Redis memory usage during population
- Test on both empty and populated databases

## Troubleshooting

**Connection errors:**
```bash
# Check if Redis is running
redis-cli ping

# Check connection string format
node populate-redis.js redis://localhost:6379
```

**Out of memory:**
- Reduce `TOTAL_KEYS` in populate-redis.js
- Reduce `LARGE_VALUE_SIZE` for smaller test values
- Use `maxmemory` policy in Redis config

**Slow population:**
- This is normal for 15k keys
- Takes ~30-60 seconds depending on your machine
- Watch the progress bars

**Script errors:**
```bash
# Make sure redis package is installed
cd scripts
npm install

# Check Node.js version (requires v14+)
node --version
```
