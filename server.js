'use strict';

const path = require('path');
const fs = require('fs');
const app = require('./app');
const config = require('./config');
const sequelize = require('./config/database');

// Ensure required directories exist
const dirs = [
  path.join(__dirname, 'data'),
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'public', 'thumbnails'),
];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    if (config.isDevelopment) {
      // In development, auto-sync with alter to apply model changes
      const { sequelize: db } = require('./models');
      await db.sync({ alter: true });
      console.log('Database synced (development mode).');
    }

    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port} [${config.env}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();