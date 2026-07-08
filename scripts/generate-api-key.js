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

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  // dotenv not installed, continue
}

const { ApiKey, sequelize } = require('../models');
const crypto = require('crypto');

async function main() {
  const args = process.argv.slice(2);
  let label = 'Default';

  // Parse --label or -l flag
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--label' || args[i] === '-l') && args[i + 1]) {
      label = args[i + 1];
      break;
    }
  }

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    // Generate a secure random key
    const key = crypto.randomBytes(32).toString('hex');

    const apiKey = await ApiKey.create({
      key,
      label,
    });

    console.log('='.repeat(60));
    console.log('🔑 API Key Generated Successfully');
    console.log('='.repeat(60));
    console.log(`Label:      ${apiKey.label}`);
    console.log(`Key ID:     ${apiKey.id}`);
    console.log(`Created At: ${apiKey.createdAt.toISOString()}`);
    console.log('');
    console.log(`API Key:    ${key}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Store this key securely!');
    console.log('   It will NOT be shown again.');
    console.log('   Use it in the Authorization header:');
    console.log(`   Authorization: Bearer ${key}`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('❌ Error generating API key:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();