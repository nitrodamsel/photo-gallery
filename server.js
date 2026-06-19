'use strict';

require('dotenv').config();

const app = require('./app');
const config = require('./config');

const PORT = config.server.port;
const ENV = config.server.nodeEnv;

app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║        Photo Gallery App Started       ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`  Environment : ${ENV}`);
  console.log(`  Server      : http://localhost:${PORT}`);
  console.log(`  Health      : http://localhost:${PORT}/health`);
  console.log('────────────────────────────────────────');
});