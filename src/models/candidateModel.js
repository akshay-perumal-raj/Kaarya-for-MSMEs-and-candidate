const { query } = require('../config/db');

async function createCandidateProfile(userId) {
  const { rows } = await query(
    `INSERT INTO candidates (user_id, status) VALUES ($1, 'PENDING') RETURNING *`,
    [userId]
  );
  return rows[0];
}

async function findByUserId(userId) {
  const { rows } = await query(`SELECT * FROM candidates WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT c.*, u.name, u.email
     FROM candidates c JOIN users u ON u.id = c.user_id
     WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function updateStatus(id, status) {
  const { rows } = await query(
    `UPDATE candidates SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return rows[0] || null;
}

async function listAll() {
  const { rows } = await query(
    `SELECT c.id, c.status, u.name, u.email, c.created_at
     FROM candidates c JOIN users u ON u.id = c.user_id
     ORDER BY c.created_at DESC`
  );
  return rows;
}

module.exports = { createCandidateProfile, findByUserId, findById, updateStatus, listAll };
