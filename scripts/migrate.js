#!/usr/bin/env node
'use strict';

/**
 * scripts/migrate.js
 *
 * Programmatic migration runner.
 * Usage: node scripts/migrate.js [--undo] [--undo-all]
 *
 * Flags:
 *   (none)      Run all pending migrations
 *   --undo      Revert the most recent migration
 *   --undo-all  Revert all migrations
 */

const path = require('path');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');

const dbConfig = require('../config/database-cli');
const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// Ensure the data directory exists
const fs = require('fs');
if (config.storage && config.storage !== ':memory:') {
  const dir = path.dirname(config.storage);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const sequelize = new Sequelize({
  dialect: config.dialect,
  storage: config.storage,
  logging: config.logging ? console.log : false,
});

const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '..', 'migrations', '*.js'),
    resolve: ({ name, path: migPath, context }) => {
      const migration = require(migPath);
      return {
        name,
        up: async () => migration.up(context, Sequelize),
        down: async () => migration.down(context, Sequelize),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.includes('--undo-all')) {
      console.log('[migrate] Reverting all migrations...');
      await umzug.down({ to: 0 });
      console.log('[migrate] All migrations reverted.');
    } else if (args.includes('--undo')) {
      console.log('[migrate] Reverting last migration...');
      await umzug.down();
      console.log('[migrate] Last migration reverted.');
    } else {
      console.log('[migrate] Running pending migrations...');
      const migrations = await umzug.up();
      if (migrations.length === 0) {
        console.log('[migrate] No pending migrations.');
      } else {
        console.log(`[migrate] Applied ${migrations.length} migration(s):`);
        migrations.forEach((m) => console.log(`  ✓ ${m.name}`));
      }
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('[migrate] Error:', err.message);
    console.error(err.stack);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

main();