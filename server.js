'use strict';

require('dotenv').config();

const app = require('./app');
const config = require('./config');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Photo Gallery server running on http://localhost:${PORT}`);
  console.log(`   Environment : ${config.nodeEnv}`);
  console.log(`   Upload dir  : ${config.uploadDir}`);
});