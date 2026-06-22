'use strict';

require('dotenv').config();

const app = require('./app');
const config = require('./config');

const PORT = config.port;
const NODE_ENV = config.nodeEnv;

const server = app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║         Photo Gallery App Started        ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Environment : ${NODE_ENV.padEnd(25)}║`);
  console.log(`║  Listening on: http://localhost:${String(PORT).padEnd(9)}║`);
  console.log(`║  Health check: http://localhost:${PORT}/health ║`);
  console.log('╚══════════════════════════════════════════╝');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = server;