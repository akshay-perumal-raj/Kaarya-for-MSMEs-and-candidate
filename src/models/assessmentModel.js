const { query } = require('../config/db');

async function createAssessment({ candidateId, taskId, type }) {
  const { rows } = await query(
    `INSERT INTO assessments (candidate_id, task_id, type, status)
     VALUES ($1, $2, $3, 'IN_PROGRESS')
     RETURNING *`,
    [candidateId, taskId, type]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await query(
    `SELECT a.*, t.code AS task_code, t.title AS task_title,
            t.start_dimension_mm, t.target_dimension_mm, t.tolerance_mm, t.target_surface_finish_ra
     FROM assessments a JOIN tasks t ON t.id = a.task_id
     WHERE a.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listByCandidate(candidateId) {
  const { rows } = await query(
    `SELECT a.*, t.code AS task_code, t.title AS task_title
     FROM assessments a JOIN tasks t ON t.id = a.task_id
     WHERE a.candidate_id = $1
     ORDER BY a.created_at DESC`,
    [candidateId]
  );
  return rows;
}

async function latestByCandidate(candidateId) {
  const { rows } = await query(
    `SELECT a.*, t.code AS task_code, t.title AS task_title
     FROM assessments a JOIN tasks t ON t.id = a.task_id
     WHERE a.candidate_id = $1
     ORDER BY a.created_at DESC
     LIMIT 1`,
    [candidateId]
  );
  return rows[0] || null;
}

async function completeAssessment(id, { score, status }) {
  const { rows } = await query(
    `UPDATE assessments
     SET score = $2, status = $3, completed_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, score, status]
  );
  return rows[0] || null;
}

module.exports = {
  createAssessment,
  findById,
  listByCandidate,
  latestByCandidate,
  completeAssessment,
};
