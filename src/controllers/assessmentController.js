const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const taskModel = require('../models/taskModel');
const assessmentModel = require('../models/assessmentModel');
const attemptModel = require('../models/attemptModel');
const skillGapModel = require('../models/skillGapModel');
const verificationModel = require('../models/verificationModel');
const candidateModel = require('../models/candidateModel');
const { evaluateAttempt } = require('../services/scoringService');
const { logAction } = require('../services/auditService');

function requireCandidateId(req) {
  if (req.user.role !== 'candidate' || !req.user.candidateId) {
    throw new ApiError(403, 'Only a candidate account can perform this action');
  }
  return req.user.candidateId;
}

// POST /api/assessments  { taskId }
// Starts a new INITIAL assessment for the logged-in candidate
const startAssessment = asyncHandler(async (req, res) => {
  const candidateId = requireCandidateId(req);
  const { taskId } = req.body;

  const task = await taskModel.findById(taskId);
  if (!task) throw new ApiError(404, 'Task not found');

  const assessment = await assessmentModel.createAssessment({ candidateId, taskId, type: 'INITIAL' });
  await logAction(req, { action: 'START_ASSESSMENT', entity: 'assessments', entityId: assessment.id });

  res.status(201).json({ assessment, task });
});

// POST /api/assessments/:id/attempts  { tool, spindleSpeedRpm, feedRateMmRev, depthOfCutMm, processSequence, cycleTimeSeconds }
// Submits the machining parameters for a CNC cycle, scores it, and closes out the assessment
const submitAttempt = asyncHandler(async (req, res) => {
  const candidateId = requireCandidateId(req);
  const assessmentId = Number(req.params.id);

  const assessment = await assessmentModel.findById(assessmentId);
  if (!assessment) throw new ApiError(404, 'Assessment not found');
  if (assessment.candidate_id !== candidateId) {
    throw new ApiError(403, 'This assessment does not belong to you');
  }
  if (assessment.status !== 'IN_PROGRESS') {
    throw new ApiError(400, 'This assessment has already been completed');
  }

  const task = await taskModel.findById(assessment.task_id);
  const evaluation = evaluateAttempt(task, req.body);

  const attempt = await attemptModel.createAttempt({
    assessmentId,
    tool: req.body.tool,
    spindleSpeedRpm: req.body.spindleSpeedRpm,
    feedRateMmRev: req.body.feedRateMmRev,
    depthOfCutMm: req.body.depthOfCutMm,
    processSequence: req.body.processSequence,
    simulatedFinalDimensionMm: evaluation.simulated.finalDimensionMm,
    simulatedSurfaceFinishRa: evaluation.simulated.surfaceFinishRa,
    cycleTimeSeconds: req.body.cycleTimeSeconds || null,
  });

  await skillGapModel.createGaps(assessmentId, evaluation.gaps);

  const updatedAssessment = await assessmentModel.completeAssessment(assessmentId, {
    score: evaluation.score,
    status: evaluation.status,
  });

  // Update the per-capability verification record shown on the employer's audit
  for (const [area, passed] of Object.entries(evaluation.verificationAreas)) {
    const status = passed
      ? (assessment.type === 'REASSESSMENT' ? 'VERIFIED_POST_TRAINING' : 'VERIFIED')
      : 'NOT_VERIFIED';
    await verificationModel.upsertVerification(candidateId, area, status);
  }

  await candidateModel.updateStatus(
    candidateId,
    evaluation.status === 'READY_FOR_ROLE' ? 'READY_FOR_ROLE' : 'GAPS_IDENTIFIED'
  );

  await logAction(req, {
    action: 'SUBMIT_ATTEMPT',
    entity: 'assessments',
    entityId: assessmentId,
    metadata: { score: evaluation.score, status: evaluation.status },
  });

  res.status(201).json({
    assessment: updatedAssessment,
    attempt,
    breakdown: evaluation.breakdown,
    gaps: evaluation.gaps,
    simulated: evaluation.simulated,
  });
});

// GET /api/assessments/:id
const getAssessment = asyncHandler(async (req, res) => {
  const assessmentId = Number(req.params.id);
  const assessment = await assessmentModel.findById(assessmentId);
  if (!assessment) throw new ApiError(404, 'Assessment not found');

  if (req.user.role === 'candidate' && req.user.candidateId !== assessment.candidate_id) {
    throw new ApiError(403, 'This assessment does not belong to you');
  }

  const attempts = await attemptModel.findByAssessment(assessmentId);
  const gaps = await skillGapModel.findByAssessment(assessmentId);

  res.json({ assessment, attempts, gaps });
});

// POST /api/assessments/:id/reassess
// Creates a new REASSESSMENT-type assessment for the same task, typically after learning modules are completed
const startReassessment = asyncHandler(async (req, res) => {
  const candidateId = requireCandidateId(req);
  const assessmentId = Number(req.params.id);

  const priorAssessment = await assessmentModel.findById(assessmentId);
  if (!priorAssessment) throw new ApiError(404, 'Assessment not found');
  if (priorAssessment.candidate_id !== candidateId) {
    throw new ApiError(403, 'This assessment does not belong to you');
  }
  if (priorAssessment.status === 'IN_PROGRESS') {
    throw new ApiError(400, 'Complete the current assessment attempt before reassessing');
  }

  const reassessment = await assessmentModel.createAssessment({
    candidateId,
    taskId: priorAssessment.task_id,
    type: 'REASSESSMENT',
  });

  await logAction(req, { action: 'START_REASSESSMENT', entity: 'assessments', entityId: reassessment.id });

  res.status(201).json({ assessment: reassessment });
});

// GET /api/candidates/me/assessments (candidate's own history)
const listMyAssessments = asyncHandler(async (req, res) => {
  const candidateId = requireCandidateId(req);
  const assessments = await assessmentModel.listByCandidate(candidateId);
  res.json({ assessments });
});

module.exports = {
  startAssessment,
  submitAttempt,
  getAssessment,
  startReassessment,
  listMyAssessments,
};
