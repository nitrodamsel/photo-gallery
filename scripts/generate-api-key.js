#!/usr/bin/env node
'use strict';

/**
 * CLI script to generate a new API key.
 * Usage: node scripts/generate-api-key.js --label "My App"
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Parse CLI arguments
const args = process.argv.slice(2);
let label = null;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--label' || args[i] === '-l') && args[i + 1]) {
    label = args[i + 1];
    i++;
  }
}

if (!label) {
  console.error('Error: --label is required');
  console.error('Usage: node scripts/generate-api-key.js --label "My App"');
  process.exit(1);
}

async function main() {
  try {
    // Initialize Sequelize
    const { sequelize } = require('../models');
    const { ApiKey } = require('../models');

    // Sync model if needed
    await sequelize.authenticate();

    const apiKey = await ApiKey.create({ label });

    console.log('\n✅ API Key created successfully!\n');
    console.log('  Label  :', apiKey.label);
    console.log('  Key ID :', apiKey.id);
    console.log('  Created:', apiKey.createdAt.toISOString());
    console.log('\n  🔑 API Key (copy now — this is the only time it will be shown):');
    console.log('\n  ', apiKey.key, '\n');
    console.log('  ⚠️  Store this key securely. It cannot be retrieved later.\n');
    console.log('  Usage: Authorization: Bearer', apiKey.key, '\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Failed to create API key:', err.message);
    if (err.original) {
      console.error('   Database error:', err.original.message);
    }
    process.exit(1);
  }
}

main();