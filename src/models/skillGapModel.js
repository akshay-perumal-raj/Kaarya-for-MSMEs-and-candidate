const { query } = require('../config/db');

async function createGaps(assessmentId, gaps) {
  // gaps: [{ gapName, description }]
  const created = [];
  for (const gap of gaps) {
    const { rows } = await query(
      `INSERT INTO skill_gaps (assessment_id, gap_name, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [assessmentId, gap.gapName, gap.description || null]
    );
    created.push(rows[0]);
  }
  return created;
}

async function findByAssessment(assessmentId) {
  const { rows } = await query(
    `SELECT * FROM skill_gaps WHERE assessment_id = $1 ORDER BY id`,
    [assessmentId]
  );
  return rows;
}

module.exports = { createGaps, findByAssessment };
