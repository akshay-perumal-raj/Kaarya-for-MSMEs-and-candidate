const { query } = require('../config/db');

async function createAttempt({
  assessmentId,
  tool,
  spindleSpeedRpm,
  feedRateMmRev,
  depthOfCutMm,
  processSequence,
  simulatedFinalDimensionMm,
  simulatedSurfaceFinishRa,
  cycleTimeSeconds,
}) {
  const { rows } = await query(
    `INSERT INTO assessment_attempts
       (assessment_id, tool, spindle_speed_rpm, feed_rate_mm_rev, depth_of_cut_mm,
        process_sequence, simulated_final_dimension_mm, simulated_surface_finish_ra, cycle_time_seconds)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      assessmentId,
      tool,
      spindleSpeedRpm,
      feedRateMmRev,
      depthOfCutMm,
      JSON.stringify(processSequence),
      simulatedFinalDimensionMm,
      simulatedSurfaceFinishRa,
      cycleTimeSeconds,
    ]
  );
  return rows[0];
}

async function findByAssessment(assessmentId) {
  const { rows } = await query(
    `SELECT * FROM assessment_attempts WHERE assessment_id = $1 ORDER BY created_at DESC`,
    [assessmentId]
  );
  return rows;
}

module.exports = { createAttempt, findByAssessment };
