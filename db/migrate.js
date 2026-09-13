/**
 * Applies db/schema.sql to the configured database.
 * Usage: npm run migrate
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { pool } = require('../src/config/db');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Applying schema.sql ...');
  try {
    await pool.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
