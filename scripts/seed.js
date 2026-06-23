'use strict';

/**
 * Programmatic seeder runner.
 * Usage: node scripts/seed.js [--undo]
 * npm scripts: npm run seed | npm run seed:undo
 */

const path = require('path');
const fs = require('fs');
const sequelize = require('../config/database');

async function getSeederFiles() {
  const seederDir = path.join(__dirname, '..', 'seeders');
  const files = fs.readdirSync(seederDir)
    .filter((f) => f.endsWith('.js'))
    .sort();
  return files.map((f) => ({ name: f, path: path.join(seederDir, f) }));
}

async function main() {
  const undo = process.argv.includes('--undo');
  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    const seeders = await getSeederFiles();

    if (undo) {
      // Run down in reverse order
      for (const seeder of [...seeders].reverse()) {
        console.log(`Reverting seeder: ${seeder.name}`);
        const mod = require(seeder.path);
        await mod.down(queryInterface, sequelize.constructor);
        console.log(`  ✓ Reverted ${seeder.name}`);
      }
    } else {
      for (const seeder of seeders) {
        console.log(`Running seeder: ${seeder.name}`);
        const mod = require(seeder.path);
        await mod.up(queryInterface, sequelize.constructor);
        console.log(`  ✓ Seeded ${seeder.name}`);
      }
    }

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Seeder error:', err);
    process.exit(1);
  }
}

main();