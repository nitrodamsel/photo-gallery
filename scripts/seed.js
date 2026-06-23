#!/usr/bin/env node
'use strict';

/**
 * CLI helper to run all seeders.
 * Usage: npm run seed
 *        node scripts/seed.js [--undo]
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
    glob: path.join(__dirname, '..', 'seeders', '*.js'),
    resolve: ({ name, path: seederPath, context }) => {
      const seeder = require(seederPath);
      return {
        name,
        up: async () => seeder.up(context, Sequelize),
        down: async () => seeder.down(context, Sequelize),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({
    sequelize,
    modelName: 'SequelizeSeederMeta', // separate table from migrations
    tableName: 'SequelizeSeedsMeta',
  }),
  logger: console,
});

async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.includes('--undo')) {
      console.log('[Seed] Reverting last seeder...');
      await umzug.down();
      console.log('[Seed] Last seeder reverted.');
    } else if (args.includes('--undo-all')) {
      console.log('[Seed] Reverting all seeders...');
      await umzug.down({ to: 0 });
      console.log('[Seed] All seeders reverted.');
    } else {
      console.log('[Seed] Running seeders...');
      const seeders = await umzug.up();
      if (seeders.length === 0) {
        console.log('[Seed] No pending seeders found.');
      } else {
        console.log(`[Seed] Applied ${seeders.length} seeder(s):`);
        seeders.forEach((s) => console.log(`  - ${s.name}`));
      }
    }
  } catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();