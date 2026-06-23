'use strict';

/**
 * Programmatic migration runner.
 * Usage: node scripts/migrate.js [--undo]
 * npm scripts: npm run migrate | npm run migrate:undo
 */

const { Umzug, SequelizeStorage } = require('umzug');
const path = require('path');
const sequelize = require('../config/database');

async function main() {
  const undo = process.argv.includes('--undo');

  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, '..', 'migrations', '*.js'),
      resolve: ({ name, path: migrationPath, context }) => {
        const migration = require(migrationPath);
        return {
          name,
          up: async () => migration.up(context, sequelize.constructor),
          down: async () => migration.down(context, sequelize.constructor),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    if (undo) {
      const reverted = await umzug.down();
      if (reverted.length === 0) {
        console.log('No migrations to revert.');
      } else {
        console.log('Reverted:', reverted.map((m) => m.name));
      }
    } else {
      const migrations = await umzug.up();
      if (migrations.length === 0) {
        console.log('No pending migrations.');
      } else {
        console.log('Applied:', migrations.map((m) => m.name));
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

main();