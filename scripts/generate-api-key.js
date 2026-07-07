#!/usr/bin/env node
'use strict';

/**
 * CLI script to generate a new API key.
 * Usage: node scripts/generate-api-key.js --label "My App"
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Ensure models are loaded with the correct config path
process.chdir(path.join(__dirname, '..'));

const { ApiKey, sequelize } = require('../models');

async function main() {
  const args = process.argv.slice(2);
  let label = 'Default';

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--label' || args[i] === '-l') && args[i + 1]) {
      label = args[i + 1];
      break;
    }
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/generate-api-key.js --label "My App"');
    console.log('');
    console.log('Options:');
    console.log('  --label, -l   Label for the API key (default: "Default")');
    console.log('  --help, -h    Show this help message');
    process.exit(0);
  }

  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    const apiKey = await ApiKey.create({ label });

    console.log('');
    console.log('✅ API key created successfully!');
    console.log('');
    console.log(`  Label: ${apiKey.label}`);
    console.log(`  ID:    ${apiKey.id}`);
    console.log(`  Key:   ${apiKey.key}`);
    console.log('');
    console.log('⚠️  WARNING: Store this key securely. It will not be shown again.');
    console.log('');
    console.log('Usage:');
    console.log(`  Authorization: Bearer ${apiKey.key}`);
    console.log('');
  } catch (err) {
    console.error('❌ Error creating API key:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();