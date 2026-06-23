'use strict';

const app = require('./app');
const { syncDatabase } = require('./models');

const PORT = process.env.PORT || 3000;
const env = process.env.NODE_ENV || 'development';

async function start() {
  try {
    // Sync database (alter in dev, skip in prod)
    await syncDatabase();

    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT} (${env})`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

start();