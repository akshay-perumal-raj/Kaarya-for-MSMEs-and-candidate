const { query } = require('../config/db');

async function markCompleted(candidateId, moduleId) {
  const { rows } = await query(
    `INSERT INTO learning_completions (candidate_id, module_id)
     VALUES ($1, $2)
     ON CONFLICT (candidate_id, module_id) DO UPDATE SET completed_at = now()
     RETURNING *`,
    [candidateId, moduleId]
  );
  return rows[0];
}

async function listByCandidate(candidateId) {
  const { rows } = await query(
    `SELECT lc.*, lm.title, lm.focus_area
     FROM learning_completions lc JOIN learning_modules lm ON lm.id = lc.module_id
     WHERE lc.candidate_id = $1`,
    [candidateId]
  );
  return rows;
}

module.exports = { markCompleted, listByCandidate };
