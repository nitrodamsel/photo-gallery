#!/usr/bin/env node
'use strict';

/**
 * CLI helper to run pending Sequelize migrations programmatically.
 * Usage: npm run migrate
 *        node scripts/migrate.js [--undo] [--undo-all]
 */

const path = require('path');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');

const env = process.env.NODE_ENV || 'development';
const dbConfig = require('../config/database-cli')[env];

const sequelize = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
  logging: false,
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
      console.log('[Migrate] Reverting all migrations...');
      await umzug.down({ to: 0 });
      console.log('[Migrate] All migrations reverted.');
    } else if (args.includes('--undo')) {
      console.log('[Migrate] Reverting last migration...');
      await umzug.down();
      console.log('[Migrate] Last migration reverted.');
    } else {
      console.log('[Migrate] Running pending migrations...');
      const migrations = await umzug.up();
      if (migrations.length === 0) {
        console.log('[Migrate] No pending migrations found.');
      } else {
        console.log(`[Migrate] Applied ${migrations.length} migration(s):`);
        migrations.forEach((m) => console.log(`  - ${m.name}`));
      }
    }
  } catch (err) {
    console.error('[Migrate] Error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();