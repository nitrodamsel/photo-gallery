#!/usr/bin/env node
'use strict';

/**
 * Programmatic migration runner.
 * Usage: npm run migrate
 *
 * Runs all pending Sequelize migrations using the Umzug library
 * (or falls back to sequelize.sync in development).
 */

const path = require('path');
const { Sequelize } = require('sequelize');
const config = require('../config');

async function runMigrations() {
  console.log('[Migrate] Starting migrations...');
  console.log(`[Migrate] Environment: ${config.env}`);

  let Umzug;
  try {
    ({ Umzug } = require('umzug'));
  } catch {
    // Umzug not installed — fall back to sync in development
    if (config.env !== 'development') {
      console.error('[Migrate] ERROR: umzug is required for production migrations.');
      process.exit(1);
    }
    console.warn('[Migrate] umzug not found. Falling back to sequelize.sync({ alter: true }) in development.');
    const { syncDatabase } = require('../models');
    await syncDatabase();
    console.log('[Migrate] Sync complete.');
    return;
  }

  const sequelize = require('../config/database');

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
    storage: {
      async executed({ context: queryInterface }) {
        await queryInterface.createTable('SequelizeMeta', {
          name: { type: Sequelize.STRING, allowNull: false, unique: true, primaryKey: true },
        }).catch(() => {}); // table may already exist

        const [results] = await queryInterface.sequelize.query(
          'SELECT name FROM SequelizeMeta'
        );
        return results.map((r) => r.name);
      },
      async logMigration({ name, context: queryInterface }) {
        await queryInterface.sequelize.query(
          `INSERT INTO SequelizeMeta (name) VALUES ('${name}')`
        );
      },
      async unlogMigration({ name, context: queryInterface }) {
        await queryInterface.sequelize.query(
          `DELETE FROM SequelizeMeta WHERE name = '${name}'`
        );
      },
    },
    logger: console,
  });

  try {
    const pending = await umzug.pending();
    if (pending.length === 0) {
      console.log('[Migrate] No pending migrations.');
    } else {
      console.log(`[Migrate] Running ${pending.length} pending migration(s)...`);
      const executed = await umzug.up();
      executed.forEach((m) => console.log(`  ✓ ${m.name}`));
    }
    console.log('[Migrate] All migrations complete.');
  } catch (err) {
    console.error('[Migrate] Migration failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigrations().catch((err) => {
  console.error('[Migrate] Unexpected error:', err);
  process.exit(1);
});