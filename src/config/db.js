const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // Unexpected errors on idle clients shouldn't crash the whole process silently
  console.error('Unexpected PostgreSQL client error', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
