#!/usr/bin/env node

/**
 * Redis Test Data Population Script
 *
 * Creates comprehensive test data to stress-test Redistal GUI:
 * - All Redis data types (String, List, Set, ZSet, Hash)
 * - Large datasets (10k+ keys)
 * - Edge cases (empty values, huge values, special characters, Unicode)
 * - Various TTL scenarios
 * - Deep nested JSON structures
 * - Binary-like data
 * - Performance testing keys
 *
 * Usage: node scripts/populate-redis.js [redis-url]
 * Example: node scripts/populate-redis.js redis://localhost:6379
 */

import { createClient } from 'redis';

// Configuration
const REDIS_URL = process.argv[2] || 'redis://localhost:6379';
const TOTAL_KEYS = 15000; // Stress test SCAN implementation
const LARGE_VALUE_SIZE = 1024 * 100; // 100KB strings
const VERY_LARGE_VALUE_SIZE = 1024 * 512; // 512KB strings

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function progress(current, total, label) {
  const percentage = Math.floor((current / total) * 100);
  const bar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
  process.stdout.write(`\r${colors.cyan}${label}: [${bar}] ${percentage}% (${current}/${total})${colors.reset}`);
  if (current === total) console.log('');
}

// Utility functions for generating test data
function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateUnicode() {
  return '🚀🎨🔥💎✨🌟⭐🎯🎪🎭🎬🎮🎲🎰🎳' + '你好世界' + 'مرحبا' + 'Привет' + '🔴🟠🟡🟢🔵🟣';
}

function generateJSON(depth = 3, breadth = 5) {
  if (depth === 0) return randomString(10);

  const obj = {};
  for (let i = 0; i < breadth; i++) {
    const key = randomString(8);
    const type = randomInt(0, 3);

    switch (type) {
      case 0:
        obj[key] = randomString(20);
        break;
      case 1:
        obj[key] = randomInt(0, 1000000);
        break;
      case 2:
        obj[key] = Array.from({ length: randomInt(3, 7) }, () => randomString(10));
        break;
      case 3:
        obj[key] = generateJSON(depth - 1, Math.floor(breadth / 2));
        break;
    }
  }
  return obj;
}

async function populateRedis() {
  log('\n🚀 Redis Test Data Population Script', 'bright');
  log(`📍 Connecting to: ${REDIS_URL}`, 'blue');

  const client = createClient({ url: REDIS_URL });

  client.on('error', (err) => {
    log(`❌ Redis Client Error: ${err.message}`, 'red');
    process.exit(1);
  });

  try {
    await client.connect();
    log('✅ Connected to Redis\n', 'green');

    let keysCreated = 0;

    // ============================================================
    // 1. STRINGS - Various sizes and formats
    // ============================================================
    log('📝 Creating STRING keys...', 'yellow');

    // Simple strings
    for (let i = 0; i < 500; i++) {
      await client.set(`string:simple:${i}`, `Simple value ${i}`);
      keysCreated++;
      if (i % 50 === 0) progress(i, 500, 'Simple strings');
    }
    progress(500, 500, 'Simple strings');

    // Large strings
    const largeText = randomString(LARGE_VALUE_SIZE);
    const veryLargeText = randomString(VERY_LARGE_VALUE_SIZE);
    for (let i = 0; i < 50; i++) {
      await client.set(`string:large:${i}`, largeText);
      keysCreated++;
      if (i % 10 === 0) progress(i, 50, 'Large strings (100KB)');
    }
    progress(50, 50, 'Large strings (100KB)');

    // Very large strings (512KB)
    for (let i = 0; i < 10; i++) {
      await client.set(`string:verylarge:${i}`, veryLargeText);
      keysCreated++;
    }
    log('Created 10 very large strings (512KB each)', 'cyan');

    // JSON strings
    for (let i = 0; i < 200; i++) {
      const jsonData = generateJSON(4, 5);
      await client.set(`string:json:user:${i}`, JSON.stringify(jsonData));
      keysCreated++;
      if (i % 20 === 0) progress(i, 200, 'JSON strings');
    }
    progress(200, 200, 'JSON strings');

    // Unicode strings
    for (let i = 0; i < 100; i++) {
      await client.set(`string:unicode:${i}`, generateUnicode() + randomString(50));
      keysCreated++;
    }
    log('Created 100 Unicode strings', 'cyan');

    // Empty string
    await client.set('string:empty', '');
    keysCreated++;

    // Special characters
    const specialStrings = [
      'string:special:newlines',
      'string:special:tabs',
      'string:special:quotes',
      'string:special:html',
      'string:special:sql',
      'string:special:xml',
    ];
    await client.set(specialStrings[0], 'Line 1\nLine 2\nLine 3\n\nLine 5');
    await client.set(specialStrings[1], 'Column1\tColumn2\tColumn3\tColumn4');
    await client.set(specialStrings[2], `Single 'quotes' and "double quotes" and \`backticks\``);
    await client.set(specialStrings[3], '<div class="test">Hello &amp; goodbye</div>');
    await client.set(specialStrings[4], `SELECT * FROM users WHERE id = '1' OR '1'='1'`);
    await client.set(specialStrings[5], '<?xml version="1.0"?>\n<root>\n  <item>Test</item>\n</root>');
    keysCreated += specialStrings.length;

    // ============================================================
    // 2. LISTS - Various lengths
    // ============================================================
    log('\n📋 Creating LIST keys...', 'yellow');

    // Small lists
    for (let i = 0; i < 300; i++) {
      const items = Array.from({ length: randomInt(5, 20) }, (_, j) => `item-${j}-${randomString(10)}`);
      await client.rPush(`list:small:${i}`, items);
      keysCreated++;
      if (i % 30 === 0) progress(i, 300, 'Small lists');
    }
    progress(300, 300, 'Small lists');

    // Large lists (1000+ items)
    for (let i = 0; i < 20; i++) {
      const items = Array.from({ length: 1000 }, (_, j) => `large-item-${j}`);
      await client.rPush(`list:large:${i}`, items);
      keysCreated++;
    }
    log('Created 20 large lists (1000 items each)', 'cyan');

    // Very large list (10k items)
    const veryLargeList = Array.from({ length: 10000 }, (_, i) => `mega-item-${i}`);
    await client.rPush('list:verylarge:mega', veryLargeList);
    keysCreated++;
    log('Created 1 very large list (10,000 items)', 'cyan');

    // List with JSON items
    for (let i = 0; i < 50; i++) {
      const jsonItems = Array.from({ length: 20 }, () => JSON.stringify(generateJSON(2, 3)));
      await client.rPush(`list:json:${i}`, jsonItems);
      keysCreated++;
    }
    log('Created 50 lists with JSON items', 'cyan');

    // Empty list (will create then clear)
    await client.rPush('list:empty:test', ['temp']);
    await client.lPop('list:empty:test');
    keysCreated++;

    // ============================================================
    // 3. SETS - Various sizes
    // ============================================================
    log('\n🎲 Creating SET keys...', 'yellow');

    // Small sets
    for (let i = 0; i < 300; i++) {
      const members = Array.from({ length: randomInt(10, 50) }, () => randomString(15));
      await client.sAdd(`set:small:${i}`, members);
      keysCreated++;
      if (i % 30 === 0) progress(i, 300, 'Small sets');
    }
    progress(300, 300, 'Small sets');

    // Large sets (1000+ members)
    for (let i = 0; i < 20; i++) {
      const members = Array.from({ length: 1000 }, (_, j) => `member-${i}-${j}`);
      await client.sAdd(`set:large:${i}`, members);
      keysCreated++;
    }
    log('Created 20 large sets (1000 members each)', 'cyan');

    // Sets with numbers
    for (let i = 0; i < 50; i++) {
      const numbers = Array.from({ length: 100 }, () => String(randomInt(1, 1000000)));
      await client.sAdd(`set:numbers:${i}`, numbers);
      keysCreated++;
    }
    log('Created 50 sets with numeric members', 'cyan');

    // Sets with Unicode
    for (let i = 0; i < 30; i++) {
      const unicodeMembers = Array.from({ length: 20 }, () => generateUnicode());
      await client.sAdd(`set:unicode:${i}`, unicodeMembers);
      keysCreated++;
    }
    log('Created 30 sets with Unicode members', 'cyan');

    // ============================================================
    // 4. SORTED SETS (ZSETs) - Various sizes and score patterns
    // ============================================================
    log('\n🏆 Creating SORTED SET keys...', 'yellow');

    // Small sorted sets
    for (let i = 0; i < 300; i++) {
      const members = Array.from({ length: randomInt(10, 30) }, (_, j) => ({
        score: randomFloat(0, 100),
        value: `member-${j}-${randomString(10)}`,
      }));
      await client.zAdd(`zset:small:${i}`, members);
      keysCreated++;
      if (i % 30 === 0) progress(i, 300, 'Small sorted sets');
    }
    progress(300, 300, 'Small sorted sets');

    // Leaderboard-style (scores 0-1000000)
    for (let i = 0; i < 50; i++) {
      const players = Array.from({ length: 100 }, (_, j) => ({
        score: randomInt(0, 1000000),
        value: `player:${randomString(8)}`,
      }));
      await client.zAdd(`zset:leaderboard:${i}`, players);
      keysCreated++;
    }
    log('Created 50 leaderboard-style sorted sets', 'cyan');

    // Timestamp-based (Unix timestamps)
    for (let i = 0; i < 50; i++) {
      const events = Array.from({ length: 50 }, (_, j) => ({
        score: Date.now() - randomInt(0, 86400000 * 30), // Last 30 days
        value: `event:${randomString(12)}`,
      }));
      await client.zAdd(`zset:timeline:${i}`, events);
      keysCreated++;
    }
    log('Created 50 timestamp-based sorted sets', 'cyan');

    // Large sorted set
    for (let i = 0; i < 10; i++) {
      const members = Array.from({ length: 1000 }, (_, j) => ({
        score: j,
        value: `item-${j}`,
      }));
      await client.zAdd(`zset:large:${i}`, members);
      keysCreated++;
    }
    log('Created 10 large sorted sets (1000 members each)', 'cyan');

    // Negative scores
    const negativeScores = Array.from({ length: 50 }, (_, i) => ({
      score: randomFloat(-1000, 1000),
      value: `item-${i}`,
    }));
    await client.zAdd('zset:negative:scores', negativeScores);
    keysCreated++;

    // Float scores with high precision
    const floatScores = Array.from({ length: 50 }, (_, i) => ({
      score: randomFloat(0, 1, 10),
      value: `precise-${i}`,
    }));
    await client.zAdd('zset:float:precision', floatScores);
    keysCreated++;

    // ============================================================
    // 5. HASHES - Various field counts
    // ============================================================
    log('\n🗂️  Creating HASH keys...', 'yellow');

    // User profiles
    for (let i = 0; i < 500; i++) {
      await client.hSet(`hash:user:${i}`, {
        id: String(i),
        username: `user_${randomString(8)}`,
        email: `${randomString(10)}@example.com`,
        first_name: randomString(8),
        last_name: randomString(10),
        age: String(randomInt(18, 80)),
        country: ['USA', 'UK', 'Canada', 'Germany', 'France', 'Japan'][randomInt(0, 5)],
        created_at: new Date(Date.now() - randomInt(0, 86400000 * 365)).toISOString(),
        is_active: String(Math.random() > 0.5),
        score: String(randomFloat(0, 100)),
      });
      keysCreated++;
      if (i % 50 === 0) progress(i, 500, 'User profile hashes');
    }
    progress(500, 500, 'User profile hashes');

    // Product catalogs
    for (let i = 0; i < 200; i++) {
      await client.hSet(`hash:product:${i}`, {
        id: `PROD-${String(i).padStart(6, '0')}`,
        name: `Product ${randomString(15)}`,
        description: randomString(100),
        price: String(randomFloat(9.99, 999.99)),
        stock: String(randomInt(0, 1000)),
        category: ['Electronics', 'Clothing', 'Food', 'Books', 'Toys'][randomInt(0, 4)],
        rating: String(randomFloat(1, 5)),
        reviews: String(randomInt(0, 5000)),
      });
      keysCreated++;
      if (i % 20 === 0) progress(i, 200, 'Product hashes');
    }
    progress(200, 200, 'Product hashes');

    // Small hashes
    for (let i = 0; i < 300; i++) {
      const fields = {};
      const fieldCount = randomInt(3, 10);
      for (let j = 0; j < fieldCount; j++) {
        fields[`field_${j}`] = randomString(20);
      }
      await client.hSet(`hash:small:${i}`, fields);
      keysCreated++;
      if (i % 30 === 0) progress(i, 300, 'Small hashes');
    }
    progress(300, 300, 'Small hashes');

    // Large hash (many fields)
    for (let i = 0; i < 10; i++) {
      const largeHash = {};
      for (let j = 0; j < 500; j++) {
        largeHash[`field_${j}`] = randomString(30);
      }
      await client.hSet(`hash:large:${i}`, largeHash);
      keysCreated++;
    }
    log('Created 10 large hashes (500 fields each)', 'cyan');

    // Hash with JSON values
    for (let i = 0; i < 50; i++) {
      await client.hSet(`hash:json:${i}`, {
        metadata: JSON.stringify(generateJSON(3, 4)),
        config: JSON.stringify({ enabled: true, timeout: 5000 }),
        data: JSON.stringify(Array.from({ length: 10 }, () => randomString(20))),
      });
      keysCreated++;
    }
    log('Created 50 hashes with JSON values', 'cyan');

    // ============================================================
    // 6. KEYS WITH TTL - Various expiration times
    // ============================================================
    log('\n⏰ Creating keys with TTL...', 'yellow');

    // Short TTL (10 seconds - 1 minute)
    for (let i = 0; i < 100; i++) {
      await client.set(`ttl:short:${i}`, `Expires soon ${i}`);
      await client.expire(`ttl:short:${i}`, randomInt(10, 60));
      keysCreated++;
    }
    log('Created 100 keys with short TTL (10s-60s)', 'cyan');

    // Medium TTL (1 hour - 1 day)
    for (let i = 0; i < 100; i++) {
      await client.set(`ttl:medium:${i}`, `Expires in hours ${i}`);
      await client.expire(`ttl:medium:${i}`, randomInt(3600, 86400));
      keysCreated++;
    }
    log('Created 100 keys with medium TTL (1h-24h)', 'cyan');

    // Long TTL (1 day - 1 week)
    for (let i = 0; i < 50; i++) {
      await client.set(`ttl:long:${i}`, `Expires in days ${i}`);
      await client.expire(`ttl:long:${i}`, randomInt(86400, 604800));
      keysCreated++;
    }
    log('Created 50 keys with long TTL (1d-7d)', 'cyan');

    // TTL on other data types
    for (let i = 0; i < 30; i++) {
      await client.rPush(`ttl:list:${i}`, ['item1', 'item2', 'item3']);
      await client.expire(`ttl:list:${i}`, 300);
      keysCreated++;
    }
    log('Created 30 lists with TTL', 'cyan');

    // ============================================================
    // 7. NAMESPACE PATTERNS - Test search/pattern matching
    // ============================================================
    log('\n🔍 Creating keys with various namespace patterns...', 'yellow');

    const namespaces = [
      'app:production:cache',
      'app:staging:cache',
      'app:production:session',
      'app:staging:session',
      'user:preferences',
      'user:settings',
      'analytics:pageview',
      'analytics:event',
      'queue:high:priority',
      'queue:low:priority',
      'temp:worker:1',
      'temp:worker:2',
    ];

    for (const ns of namespaces) {
      for (let i = 0; i < 100; i++) {
        await client.set(`${ns}:${i}`, `Value for ${ns}:${i}`);
        keysCreated++;
      }
      log(`Created 100 keys in namespace: ${ns}`, 'cyan');
    }

    // ============================================================
    // 8. STRESS TEST KEYS - Fill remaining to reach TOTAL_KEYS
    // ============================================================
    const remaining = TOTAL_KEYS - keysCreated;
    if (remaining > 0) {
      log(`\n💪 Creating ${remaining} additional stress test keys...`, 'yellow');

      for (let i = 0; i < remaining; i++) {
        const type = i % 5;
        switch (type) {
          case 0:
            await client.set(`stress:string:${i}`, randomString(50));
            break;
          case 1:
            await client.rPush(`stress:list:${i}`, [randomString(20), randomString(20)]);
            break;
          case 2:
            await client.sAdd(`stress:set:${i}`, [randomString(15), randomString(15)]);
            break;
          case 3:
            await client.zAdd(`stress:zset:${i}`, [{ score: i, value: randomString(10) }]);
            break;
          case 4:
            await client.hSet(`stress:hash:${i}`, { field1: randomString(20), field2: randomString(20) });
            break;
        }
        keysCreated++;
        if (i % 500 === 0) progress(i, remaining, 'Stress test keys');
      }
      progress(remaining, remaining, 'Stress test keys');
    }

    // ============================================================
    // 9. EDGE CASES
    // ============================================================
    log('\n🎯 Creating edge case keys...', 'yellow');

    // Very long key name
    const longKeyName = 'edge:' + 'a'.repeat(1000);
    await client.set(longKeyName, 'Long key name test');
    keysCreated++;

    // Key with special Redis characters
    await client.set('edge:special:key*with?chars[test]', 'Special characters in key');
    keysCreated++;

    // Keys that look like patterns
    await client.set('edge:pattern:user:*', 'Looks like a pattern');
    await client.set('edge:pattern:user:?', 'Also looks like a pattern');
    await client.set('edge:pattern:user:[abc]', 'Bracket pattern');
    keysCreated += 3;

    // Numeric-only keys
    for (let i = 0; i < 50; i++) {
      await client.set(String(1000000 + i), `Numeric key ${i}`);
      keysCreated++;
    }
    log('Created 50 numeric-only keys', 'cyan');

    // Keys with colons at different positions
    await client.set(':leading:colon', 'Value');
    await client.set('trailing:colon:', 'Value');
    await client.set('::multiple::colons::', 'Value');
    keysCreated += 3;

    // ============================================================
    // SUMMARY
    // ============================================================
    log('\n' + '='.repeat(60), 'green');
    log('✅ Population Complete!', 'bright');
    log('='.repeat(60), 'green');
    log(`\n📊 Total keys created: ${keysCreated}`, 'cyan');

    // Get actual key count from Redis
    const dbSize = await client.dbSize();
    log(`📊 Redis DBSIZE: ${dbSize}`, 'cyan');

    log('\n📋 Data Type Breakdown:', 'yellow');
    log('  • Strings: ~1,000+ (including JSON, Unicode, large values)', 'white');
    log('  • Lists: ~400+ (small to 10k items)', 'white');
    log('  • Sets: ~400+ (various sizes)', 'white');
    log('  • Sorted Sets: ~450+ (various score patterns)', 'white');
    log('  • Hashes: ~1,100+ (user profiles, products, etc.)', 'white');
    log(`  • Stress test keys: ~${TOTAL_KEYS - 3500}+`, 'white');
    log('  • Edge cases: ~60+', 'white');

    log('\n🎯 Test Scenarios Covered:', 'yellow');
    log('  ✓ SCAN performance with 10k+ keys', 'green');
    log('  ✓ Large values (100KB - 512KB)', 'green');
    log('  ✓ Very large collections (10k items)', 'green');
    log('  ✓ Unicode and special characters', 'green');
    log('  ✓ JSON serialization/deserialization', 'green');
    log('  ✓ TTL handling (short/medium/long)', 'green');
    log('  ✓ Pattern matching and namespaces', 'green');
    log('  ✓ Edge cases (long keys, special chars)', 'green');
    log('  ✓ All Redis data types', 'green');

    log('\n💡 Suggested Tests:', 'yellow');
    log('  1. Test SCAN with pattern matching (e.g., "user:*")', 'white');
    log('  2. Verify large value viewing (string:verylarge:*)', 'white');
    log('  3. Check TTL display and countdown (ttl:short:*)', 'white');
    log('  4. Test sorting/pagination with large lists', 'white');
    log('  5. Verify Unicode rendering (string:unicode:*)', 'white');
    log('  6. Test JSON formatting in viewer (string:json:*)', 'white');
    log('  7. Check sorted set score display (zset:*)', 'white');
    log('  8. Verify hash field browsing (hash:large:*)', 'white');

    await client.quit();
    log('\n👋 Disconnected from Redis\n', 'blue');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    if (error.stack) {
      log(error.stack, 'red');
    }
    await client.quit();
    process.exit(1);
  }
}

// Run the script
populateRedis().catch(console.error);
