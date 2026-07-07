#!/usr/bin/env node
'use strict';

/**
 * CLI script to generate a new API key.
 * Usage: node scripts/generate-api-key.js --label "My App"
 */

const path = require('path');

// Ensure we can find the project root
process.chdir(path.join(__dirname, '..'));

// Parse CLI args
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--label' && argv[i + 1]) {
      args.label = argv[i + 1];
      i++;
    } else if (argv[i].startsWith('--label=')) {
      args.label = argv[i].slice('--label='.length);
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Usage: node scripts/generate-api-key.js [options]

Options:
  --label <name>    Label for the API key (required)
  --help, -h        Show this help message

Example:
  node scripts/generate-api-key.js --label "My Mobile App"
  node scripts/generate-api-key.js --label "CI/CD Pipeline"
`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const label = args.label || `API Key ${new Date().toISOString()}`;

  try {
    // Initialize database connection
    const { sequelize } = require('../config/database');
    const ApiKey = require('../models/ApiKey')(sequelize);

    // Sync the ApiKey table if it doesn't exist
    await ApiKey.sync({ alter: false }).catch(async () => {
      // Table might not exist yet, try creating it
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id TEXT PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          label TEXT NOT NULL DEFAULT 'Unnamed Key',
          lastUsedAt DATETIME,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_unique ON api_keys (key)`);
    });

    const generatedKey = ApiKey.generateKey();

    const apiKey = await ApiKey.create({
      key: generatedKey,
      label: label,
    });

    console.log('\n✅ API Key generated successfully!\n');
    console.log('┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│                        NEW API KEY CREATED                          │');
    console.log('├─────────────────────────────────────────────────────────────────────┤');
    console.log(`│ ID:    ${apiKey.id.padEnd(61)} │`);
    console.log(`│ Label: ${label.padEnd(61)} │`);
    console.log(`│ Key:   ${generatedKey.padEnd(61)} │`);
    console.log(`│ Created: ${apiKey.createdAt.toISOString().padEnd(59)} │`);
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    console.log('\n⚠️  WARNING: Store this key securely. It will not be shown again.');
    console.log('\nUsage in API requests:');
    console.log(`  Authorization: Bearer ${generatedKey}`);
    console.log('\nExample curl:');
    console.log(`  curl -H "Authorization: Bearer ${generatedKey}" http://localhost:3000/api/v1/images\n`);

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error generating API key:', err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();