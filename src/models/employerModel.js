const { query } = require('../config/db');

async function createEmployerProfile(userId, companyName) {
  const { rows } = await query(
    `INSERT INTO employers (user_id, company_name) VALUES ($1, $2) RETURNING *`,
    [userId, companyName]
  );
  return rows[0];
}

async function findByUserId(userId) {
  const { rows } = await query(`SELECT * FROM employers WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

module.exports = { createEmployerProfile, findByUserId };
