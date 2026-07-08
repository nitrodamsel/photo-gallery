#!/usr/bin/env node
'use strict';

/**
 * CLI script to generate a new API key.
 *
 * Usage:
 *   node scripts/generate-api-key.js --label "My App"
 *   node scripts/generate-api-key.js -l "My App"
 */

const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Parse CLI args
const args = process.argv.slice(2);
let label = null;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--label' || args[i] === '-l') && args[i + 1]) {
    label = args[i + 1];
    i++;
  }
}

if (!label) {
  console.error('Error: --label <name> is required');
  console.error('Usage: node scripts/generate-api-key.js --label "My App"');
  process.exit(1);
}

async function main() {
  // Initialize Sequelize and models
  const { sequelize, ApiKey } = require('../models');

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database\n');

    const apiKey = await ApiKey.create({ label });

    console.log('✅ API Key generated successfully!');
    console.log('');
    console.log('  Label:    ', apiKey.label);
    console.log('  ID:       ', apiKey.id);
    console.log('  Key:      ', apiKey.key);
    console.log('  Created:  ', apiKey.createdAt.toISOString());
    console.log('');
    console.log('⚠️  Store this key securely — it will not be shown again.');
    console.log('');
    console.log('Usage:');
    console.log(`  curl -H "Authorization: Bearer ${apiKey.key}" http://localhost:3000/api/v1/images`);

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to generate API key:', err.message);
    if (err.stack) console.error(err.stack);
    try { await sequelize.close(); } catch (_) {}
    process.exit(1);
  }
}

main();