#!/usr/bin/env node
'use strict';

/**
 * scripts/seed.js
 *
 * CLI helper that runs all seeders in order.
 * Usage: node scripts/seed.js [--undo]
 *
 * Flags:
 *   (none)  Run all seeders
 *   --undo  Undo all seeders (calls each seeder's down() function)
 */

const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');

const dbConfig = require('../config/database-cli');
const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// Ensure the data directory exists
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

async function loadSeeders() {
  const seedersDir = path.join(__dirname, '..', 'seeders');
  const files = fs
    .readdirSync(seedersDir)
    .filter((f) => f.endsWith('.js'))
    .sort(); // run in alphabetical/numerical order

  return files.map((file) => ({
    name: file,
    module: require(path.join(seedersDir, file)),
  }));
}

async function main() {
  const args = process.argv.slice(2);
  const undo = args.includes('--undo');

  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log('[seed] Database connection established.');

    const seeders = await loadSeeders();

    if (undo) {
      // Run down() in reverse order
      const reversed = [...seeders].reverse();
      for (const seeder of reversed) {
        console.log(`[seed] Undoing: ${seeder.name}`);
        await seeder.module.down(queryInterface, Sequelize);
        console.log(`[seed]   ✓ Undone: ${seeder.name}`);
      }
      console.log('[seed] All seeders undone.');
    } else {
      for (const seeder of seeders) {
        console.log(`[seed] Running: ${seeder.name}`);
        await seeder.module.up(queryInterface, Sequelize);
        console.log(`[seed]   ✓ Done: ${seeder.name}`);
      }
      console.log('[seed] All seeders completed.');
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('[seed] Error:', err.message);
    console.error(err.stack);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

main();