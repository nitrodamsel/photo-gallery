#!/usr/bin/env node
'use strict';

/**
 * Database seeder CLI helper.
 * Usage: npm run seed
 *
 * Loads all seeders in order and executes them.
 */

const path = require('path');
const config = require('../config');

async function runSeeders() {
  console.log('[Seed] Starting database seeding...');
  console.log(`[Seed] Environment: ${config.env}`);

  // Ensure DB is initialized
  const { syncDatabase, ...models } = require('../models');

  // Run sync first (creates tables if not exist)
  await syncDatabase();

  // Load seeders in order
  const seederFiles = [
    '../seeders/001-sample-tags.js',
    '../seeders/002-sample-images.js',
  ];

  for (const seederPath of seederFiles) {
    const seederName = path.basename(seederPath);
    console.log(`\n[Seed] Running seeder: ${seederName}`);
    try {
      const seeder = require(seederPath);
      await seeder.run(models);
      console.log(`[Seed] ✓ ${seederName} complete`);
    } catch (err) {
      console.error(`[Seed] ✗ ${seederName} failed:`, err.message);
      console.error(err.stack);
      process.exit(1);
    }
  }

  console.log('\n[Seed] All seeders complete.');
}

runSeeders().catch((err) => {
  console.error('[Seed] Unexpected error:', err);
  process.exit(1);
}).finally(async () => {
  try {
    const { sequelize } = require('../models');
    await sequelize.close();
  } catch {
    // ignore
  }
  process.exit(0);
});