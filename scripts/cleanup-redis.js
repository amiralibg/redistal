#!/usr/bin/env node

/**
 * Redis Database Cleanup Script
 *
 * Removes all test data created by populate-redis.js
 * Provides options for selective or complete cleanup
 *
 * Usage:
 *   node scripts/cleanup-redis.js [redis-url] [mode]
 *
 * Modes:
 *   all      - Delete all keys (FLUSHDB)
 *   test     - Delete only test data keys (default)
 *   pattern  - Delete specific pattern (will prompt)
 *
 * Examples:
 *   node scripts/cleanup-redis.js redis://localhost:6379 all
 *   node scripts/cleanup-redis.js redis://localhost:6379 test
 *   node scripts/cleanup-redis.js redis://localhost:6379 pattern
 */

import { createClient } from 'redis';
import * as readline from 'readline';

// Configuration
const REDIS_URL = process.argv[2] || 'redis://localhost:6379';
const MODE = process.argv[3] || 'test';

// All test key prefixes created by populate-redis.js
const TEST_PREFIXES = [
  'string:simple:',
  'string:large:',
  'string:verylarge:',
  'string:json:',
  'string:unicode:',
  'string:empty',
  'string:special:',
  'list:small:',
  'list:large:',
  'list:verylarge:',
  'list:json:',
  'list:empty:',
  'set:small:',
  'set:large:',
  'set:numbers:',
  'set:unicode:',
  'zset:small:',
  'zset:leaderboard:',
  'zset:timeline:',
  'zset:large:',
  'zset:negative:',
  'zset:float:',
  'hash:user:',
  'hash:product:',
  'hash:small:',
  'hash:large:',
  'hash:json:',
  'ttl:short:',
  'ttl:medium:',
  'ttl:long:',
  'ttl:list:',
  'app:production:',
  'app:staging:',
  'user:preferences:',
  'user:settings:',
  'analytics:pageview:',
  'analytics:event:',
  'queue:high:',
  'queue:low:',
  'temp:worker:',
  'stress:string:',
  'stress:list:',
  'stress:set:',
  'stress:zset:',
  'stress:hash:',
  'edge:',
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
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

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(query) {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function confirmAction(message) {
  const answer = await askQuestion(`${colors.yellow}${message} (yes/no): ${colors.reset}`);
  return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
}

async function cleanupAllKeys(client) {
  log('\n⚠️  FLUSH DATABASE MODE', 'red');
  log('This will delete ALL keys in the current database!', 'red');

  const confirmed = await confirmAction('Are you absolutely sure?');
  if (!confirmed) {
    log('❌ Cleanup cancelled', 'yellow');
    return 0;
  }

  const dbSizeBefore = await client.dbSize();
  log(`\n📊 Keys before flush: ${dbSizeBefore}`, 'cyan');

  await client.flushDb();
  log('✅ Database flushed', 'green');

  return dbSizeBefore;
}

async function cleanupTestKeys(client) {
  log('\n🧹 TEST DATA CLEANUP MODE', 'yellow');
  log('This will delete keys matching test data patterns', 'white');

  // First, get a count estimate
  log('\n🔍 Scanning for test keys...', 'blue');
  let keysToDelete = [];
  let scanned = 0;

  for (const prefix of TEST_PREFIXES) {
    let cursor = 0;
    do {
      const result = await client.scan(cursor, {
        MATCH: `${prefix}*`,
        COUNT: 1000,
      });
      cursor = result.cursor;
      keysToDelete.push(...result.keys);
      scanned++;
    } while (cursor !== 0);
  }

  // Also scan for numeric-only keys (from edge cases)
  for (let i = 0; i < 50; i++) {
    const key = String(1000000 + i);
    const exists = await client.exists(key);
    if (exists) keysToDelete.push(key);
  }

  // Remove duplicates
  keysToDelete = [...new Set(keysToDelete)];

  if (keysToDelete.length === 0) {
    log('✅ No test keys found to delete', 'green');
    return 0;
  }

  log(`\n📊 Found ${keysToDelete.length} test keys to delete`, 'cyan');
  log(`🔍 Scanned ${TEST_PREFIXES.length} patterns`, 'cyan');

  const confirmed = await confirmAction(`Delete ${keysToDelete.length} keys?`);
  if (!confirmed) {
    log('❌ Cleanup cancelled', 'yellow');
    return 0;
  }

  log('\n🗑️  Deleting keys...', 'yellow');

  // Delete in batches of 1000 for better performance
  const BATCH_SIZE = 1000;
  let deleted = 0;

  for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
    const batch = keysToDelete.slice(i, i + BATCH_SIZE);
    await client.del(batch);
    deleted += batch.length;
    progress(deleted, keysToDelete.length, 'Deleting keys');
  }

  return deleted;
}

async function cleanupByPattern(client) {
  log('\n🎯 PATTERN CLEANUP MODE', 'yellow');
  log('Enter a pattern to delete matching keys (e.g., "user:*", "cache:*")', 'white');

  const pattern = await askQuestion(`${colors.cyan}Pattern: ${colors.reset}`);
  if (!pattern || pattern.trim() === '') {
    log('❌ No pattern provided', 'red');
    return 0;
  }

  log(`\n🔍 Scanning for keys matching: ${pattern}`, 'blue');

  let keysToDelete = [];
  let cursor = 0;

  do {
    const result = await client.scan(cursor, {
      MATCH: pattern,
      COUNT: 1000,
    });
    cursor = result.cursor;
    keysToDelete.push(...result.keys);
  } while (cursor !== 0);

  if (keysToDelete.length === 0) {
    log(`✅ No keys found matching pattern: ${pattern}`, 'green');
    return 0;
  }

  log(`\n📊 Found ${keysToDelete.length} keys matching pattern`, 'cyan');

  // Show first 10 keys as preview
  log('\n📋 Preview (first 10 keys):', 'yellow');
  keysToDelete.slice(0, 10).forEach((key, i) => {
    log(`  ${i + 1}. ${key}`, 'white');
  });
  if (keysToDelete.length > 10) {
    log(`  ... and ${keysToDelete.length - 10} more`, 'white');
  }

  const confirmed = await confirmAction(`Delete ${keysToDelete.length} keys?`);
  if (!confirmed) {
    log('❌ Cleanup cancelled', 'yellow');
    return 0;
  }

  log('\n🗑️  Deleting keys...', 'yellow');

  // Delete in batches
  const BATCH_SIZE = 1000;
  let deleted = 0;

  for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
    const batch = keysToDelete.slice(i, i + BATCH_SIZE);
    await client.del(batch);
    deleted += batch.length;
    progress(deleted, keysToDelete.length, 'Deleting keys');
  }

  return deleted;
}

async function showStatistics(client) {
  log('\n📊 DATABASE STATISTICS', 'bright');
  log('='.repeat(60), 'cyan');

  const dbSize = await client.dbSize();
  log(`Total Keys: ${dbSize}`, 'white');

  if (dbSize === 0) {
    log('Database is empty', 'green');
    return;
  }

  // Sample some keys to show data types
  log('\n📋 Sample Keys by Type:', 'yellow');

  const sampleSize = Math.min(100, dbSize);
  let cursor = 0;
  const samples = [];

  const result = await client.scan(cursor, { COUNT: sampleSize });
  samples.push(...result.keys);

  const typeCount = {
    string: 0,
    list: 0,
    set: 0,
    zset: 0,
    hash: 0,
    stream: 0,
  };

  for (const key of samples.slice(0, 50)) {
    const type = await client.type(key);
    typeCount[type] = (typeCount[type] || 0) + 1;
  }

  Object.entries(typeCount).forEach(([type, count]) => {
    if (count > 0) {
      log(`  • ${type}: ${count} (from sample)`, 'white');
    }
  });

  // Show some test prefixes that still exist
  log('\n🔍 Test Data Remaining:', 'yellow');
  let hasTestData = false;

  for (const prefix of TEST_PREFIXES.slice(0, 10)) {
    const result = await client.scan(0, { MATCH: `${prefix}*`, COUNT: 1 });
    if (result.keys.length > 0) {
      log(`  • ${prefix}* (exists)`, 'white');
      hasTestData = true;
    }
  }

  if (!hasTestData) {
    log('  No test data prefixes found', 'green');
  }
}

async function cleanup() {
  log('\n🧹 Redis Database Cleanup Script', 'bright');
  log(`📍 Connecting to: ${REDIS_URL}`, 'blue');

  const client = createClient({ url: REDIS_URL });

  client.on('error', (err) => {
    log(`❌ Redis Client Error: ${err.message}`, 'red');
    process.exit(1);
  });

  try {
    await client.connect();
    log('✅ Connected to Redis', 'green');

    const dbSizeBefore = await client.dbSize();
    log(`📊 Current database size: ${dbSizeBefore} keys\n`, 'cyan');

    if (dbSizeBefore === 0) {
      log('✅ Database is already empty', 'green');
      await client.quit();
      return;
    }

    let deletedCount = 0;

    switch (MODE.toLowerCase()) {
      case 'all':
        deletedCount = await cleanupAllKeys(client);
        break;
      case 'pattern':
        deletedCount = await cleanupByPattern(client);
        break;
      case 'test':
      default:
        deletedCount = await cleanupTestKeys(client);
        break;
    }

    const dbSizeAfter = await client.dbSize();

    // Summary
    log('\n' + '='.repeat(60), 'green');
    log('✅ Cleanup Complete!', 'bright');
    log('='.repeat(60), 'green');
    log(`\n📊 Keys before: ${dbSizeBefore}`, 'cyan');
    log(`📊 Keys deleted: ${deletedCount}`, 'red');
    log(`📊 Keys remaining: ${dbSizeAfter}`, 'green');

    if (dbSizeAfter > 0) {
      await showStatistics(client);
    }

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

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('\n🧹 Redis Cleanup Script - Usage', 'bright');
  log('\nSyntax:', 'yellow');
  log('  node scripts/cleanup-redis.js [redis-url] [mode]', 'white');
  log('\nModes:', 'yellow');
  log('  all      - Delete ALL keys using FLUSHDB (dangerous!)', 'white');
  log('  test     - Delete only test data keys (default, safe)', 'white');
  log('  pattern  - Delete keys matching a custom pattern', 'white');
  log('\nExamples:', 'yellow');
  log('  node scripts/cleanup-redis.js redis://localhost:6379 test', 'cyan');
  log('  node scripts/cleanup-redis.js redis://localhost:6379 all', 'cyan');
  log('  node scripts/cleanup-redis.js redis://localhost:6379 pattern', 'cyan');
  log('');
  process.exit(0);
}

// Run the script
cleanup().catch(console.error);
