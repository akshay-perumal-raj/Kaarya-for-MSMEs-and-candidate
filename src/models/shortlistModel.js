const { query } = require('../config/db');

async function upsertShortlist({ employerId, candidateId, roleId, status }) {
  const { rows } = await query(
    `INSERT INTO shortlists (employer_id, candidate_id, role_id, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (employer_id, candidate_id)
     DO UPDATE SET status = EXCLUDED.status, role_id = EXCLUDED.role_id
     RETURNING *`,
    [employerId, candidateId, roleId, status]
  );
  return rows[0];
}

async function listByEmployer(employerId) {
  const { rows } = await query(
    `SELECT s.*, c.id AS candidate_id, u.name AS candidate_name
     FROM shortlists s
     JOIN candidates c ON c.id = s.candidate_id
     JOIN users u ON u.id = c.user_id
     WHERE s.employer_id = $1`,
    [employerId]
  );
  return rows;
}

module.exports = { upsertShortlist, listByEmployer };
