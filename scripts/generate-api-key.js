#!/usr/bin/env node
'use strict';

/**
 * CLI script to generate a new API key.
 * Usage: node scripts/generate-api-key.js --label "My App"
 */

const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { ApiKey, sequelize } = require('../models');

async function main() {
  const args = process.argv.slice(2);

  // Parse --label argument
  let label = 'Unnamed Key';
  const labelIdx = args.indexOf('--label');
  if (labelIdx !== -1 && args[labelIdx + 1]) {
    label = args[labelIdx + 1];
  }

  try {
    // Ensure DB is connected
    await sequelize.authenticate();

    const apiKey = await ApiKey.create({ label });

    console.log('\n✅ API Key created successfully!\n');
    console.log(`  Label   : ${apiKey.label}`);
    console.log(`  ID      : ${apiKey.id}`);
    console.log(`  Key     : ${apiKey.key}`);
    console.log(`  Created : ${apiKey.createdAt.toISOString()}`);
    console.log('\n⚠️  WARNING: Store this key securely — it will not be shown again.\n');
    console.log('Usage: Authorization: Bearer ' + apiKey.key + '\n');
  } catch (err) {
    console.error('❌ Failed to create API key:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();