const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

let db;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Failed to connect to SQLite database:', err.message);
        throw err;
      }
      console.log(`Connected to SQLite database at ${DB_PATH}`);
    });
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');
  }
  return db;
}

// Promisified helpers
const database = {
  get db() {
    return getDb();
  },

  /**
   * Run a query that doesn't return rows (INSERT, UPDATE, DELETE, CREATE).
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  /**
   * Get a single row.
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  /**
   * Get all rows.
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Close the database connection.
   */
  close() {
    return new Promise((resolve, reject) => {
      if (!db) return resolve();
      db.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          resolve();
        }
      });
    });
  },
};

module.exports = database;