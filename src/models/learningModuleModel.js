const { query } = require('../config/db');

async function listModules() {
  const { rows } = await query(`SELECT * FROM learning_modules ORDER BY id`);
  return rows;
}

async function findByFocusAreas(focusAreas) {
  if (!focusAreas.length) return [];
  const { rows } = await query(
    `SELECT * FROM learning_modules WHERE focus_area = ANY($1::text[])`,
    [focusAreas]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM learning_modules WHERE id = $1`, [id]);
  return rows[0] || null;
}

module.exports = { listModules, findByFocusAreas, findById };
