#!/usr/bin/env node
'use strict';

/**
 * CLI script to generate a new API key.
 * Usage: node scripts/generate-api-key.js --label "My App"
 */

const path = require('path');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  // dotenv not available, continue
}

const { ApiKey } = require('../models');

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--label' && args[i + 1]) {
      result.label = args[i + 1];
      i++;
    } else if (args[i].startsWith('--label=')) {
      result.label = args[i].slice(8);
    }
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const label = args.label || 'Unnamed Key';

  try {
    // Generate a unique key
    const key = ApiKey.generateKey();

    // Create the API key record
    const apiKey = await ApiKey.create({
      key,
      label,
    });

    console.log('');
    console.log('✅ API Key created successfully!');
    console.log('');
    console.log('  ID:      ' + apiKey.id);
    console.log('  Label:   ' + apiKey.label);
    console.log('  Created: ' + apiKey.createdAt.toISOString());
    console.log('');
    console.log('  API Key: ' + key);
    console.log('');
    console.log('⚠️  IMPORTANT: Store this key securely! It will not be shown again.');
    console.log('');
    console.log('Usage example:');
    console.log('  curl -H "Authorization: Bearer ' + key + '" http://localhost:3000/api/v1/images');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('❌ Failed to create API key:', err.message);
    console.error('');

    if (err.message && err.message.includes('no such table')) {
      console.error('💡 Tip: Run migrations first: node scripts/migrate.js');
      console.error('');
    }

    process.exit(1);
  }
}

main();