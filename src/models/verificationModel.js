const { query } = require('../config/db');

async function upsertVerification(candidateId, area, status) {
  const { rows } = await query(
    `INSERT INTO verification_records (candidate_id, area, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (candidate_id, area)
     DO UPDATE SET status = EXCLUDED.status, updated_at = now()
     RETURNING *`,
    [candidateId, area, status]
  );
  return rows[0];
}

async function listByCandidate(candidateId) {
  const { rows } = await query(
    `SELECT * FROM verification_records WHERE candidate_id = $1 ORDER BY area`,
    [candidateId]
  );
  return rows;
}

module.exports = { upsertVerification, listByCandidate };
