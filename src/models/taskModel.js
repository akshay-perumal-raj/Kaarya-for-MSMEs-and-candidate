const { query } = require('../config/db');

async function listTasks() {
  const { rows } = await query(
    `SELECT t.*, r.name AS role_name FROM tasks t
     LEFT JOIN roles r ON r.id = t.role_id
     ORDER BY t.id`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT t.*, r.name AS role_name FROM tasks t
     LEFT JOIN roles r ON r.id = t.role_id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByCode(code) {
  const { rows } = await query(`SELECT * FROM tasks WHERE code = $1`, [code]);
  return rows[0] || null;
}

module.exports = { listTasks, findById, findByCode };
