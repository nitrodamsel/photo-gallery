const path = require('path');

module.exports = {
  database: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'database.sqlite'),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  },
  server: {
    port: process.env.PORT || 3000,
  },
  upload: {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10),
    uploadsDir: path.join(__dirname, '..', 'uploads'),
  },
};