#!/usr/bin/env node
'use strict';

/**
 * CLI script to generate a new API key.
 *
 * Usage:
 *   node scripts/generate-api-key.js --label "My App"
 *   node scripts/generate-api-key.js -l "My App"
 *
 * Options:
 *   --label, -l   Label for the API key (default: "CLI Generated Key")
 *   --help, -h    Show help
 */

const path = require('path');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  // dotenv not available, continue
}

const args = process.argv.slice(2);

// Parse arguments
function parseArgs(argv) {
  const result = { label: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help' || argv[i] === '-h') {
      result.help = true;
    } else if ((argv[i] === '--label' || argv[i] === '-l') && argv[i + 1]) {
      result.label = argv[++i];
    }
  }
  return result;
}

const options = parseArgs(args);

if (options.help) {
  console.log(`
Generate a new API key for the Photo Gallery API.

Usage:
  node scripts/generate-api-key.js --label "My App"
  node scripts/generate-api-key.js -l "My App"

Options:
  --label, -l   A descriptive label for the API key
  --help, -h    Show this help message

Example:
  node scripts/generate-api-key.js --label "My Integration"
  `);
  process.exit(0);
}

const label = options.label || 'CLI Generated Key';

async function main() {
  let db;
  try {
    db = require('../models');
    await db.sequelize.authenticate();
    console.log('✓ Connected to database\n');
  } catch (err) {
    console.error('✗ Failed to connect to database:', err.message);
    console.error('\nMake sure your database is running and .env is configured correctly.');
    process.exit(1);
  }

  try {
    const { ApiKey } = db;
    const crypto = require('crypto');

    // Generate a secure random key
    const key = crypto.randomBytes(32).toString('hex');

    // Create the API key record
    const apiKey = await ApiKey.create({
      key,
      label,
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ✓ API Key Generated Successfully');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  ID:        ' + apiKey.id);
    console.log('  Label:     ' + apiKey.label);
    console.log('  Created:   ' + apiKey.createdAt.toISOString());
    console.log('');
    console.log('  API Key:');
    console.log('');
    console.log('  ' + key);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  ⚠️  IMPORTANT: Store this key securely.');
    console.log('  It will NOT be shown again.');
    console.log('');
    console.log('  Use it in API requests:');
    console.log('  Authorization: Bearer ' + key);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');

    await db.sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('✗ Failed to create API key:', err.message);
    if (err.errors) {
      err.errors.forEach((e) => console.error('  -', e.message));
    }
    await db.sequelize.close();
    process.exit(1);
  }
}

main();