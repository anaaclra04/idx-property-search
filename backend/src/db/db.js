const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10, // Maximum number of concurrent connections
  queueLimit: 0
});

// Export the pool to use in other files
module.exports = pool;

// Verify connectivity as soon as this module is required, rather than via a
// separate connect() call — this is a deliberate fail-fast: if the database
// is unreachable, the process exits immediately instead of starting a server
// that would fail on its first query. One consequence: any test that imports
// a route file which requires this module will trigger a real connection
// attempt unless the module is mocked first (see routes/properties.test.js,
// which mocks this file with a factory so its top-level code never runs).

// Keep the event loop alive and verify connectivity on startup
pool.getConnection()
  .then(conn => {
    console.log('Database connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });