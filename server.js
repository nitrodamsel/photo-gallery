require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const config = require('./config');

const PORT = config.server.port || 3000;

async function startServer() {
  try {
    // Sync database (create tables if they don't exist)
    await sequelize.sync({ alter: false });
    console.log('[DB] Database synchronized successfully.');

    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
}

startServer();