/**
 * Loads db/seed.sql (roles, tasks, learning modules) then creates demo
 * users with properly bcrypt-hashed passwords.
 * Usage: npm run seed
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const DEMO_PASSWORD = 'Password123!';

async function seed() {
  const client = await pool.connect();
  try {
    const seedSqlPath = path.join(__dirname, 'seed.sql');
    const sql = fs.readFileSync(seedSqlPath, 'utf8');

    console.log('Applying seed.sql (roles, tasks, learning modules) ...');
    await client.query(sql);

    console.log('Creating demo users ...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const demoUsers = [
      { name: 'Ravi Kumar', email: 'ravi.kumar@example.com', role: 'candidate' },
      { name: 'MSME Demo Owner', email: 'owner@example.com', role: 'employer' },
      { name: 'Admin', email: 'admin@example.com', role: 'admin' },
    ];

    const userIds = {};
    for (const u of demoUsers) {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, role`,
        [u.name, u.email, passwordHash, u.role]
      );
      userIds[u.role] = result.rows[0].id;
    }

    await client.query(
      `INSERT INTO candidates (user_id, status) VALUES ($1, 'PENDING')
       ON CONFLICT (user_id) DO NOTHING`,
      [userIds.candidate]
    );

    await client.query(
      `INSERT INTO employers (user_id, company_name) VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userIds.employer, 'Demo Precision Works']
    );

    console.log('Seed complete.');
    console.log(`Demo login password for all demo accounts: ${DEMO_PASSWORD}`);
    console.log('  candidate: ravi.kumar@example.com');
    console.log('  employer : owner@example.com');
    console.log('  admin    : admin@example.com');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
