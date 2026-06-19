'use strict';

require('dotenv').config();

const app = require('./app');
const config = require('./config');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`\n🚀 Photo Gallery App is running!`);
  console.log(`   Environment : ${config.nodeEnv}`);
  console.log(`   URL         : http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});