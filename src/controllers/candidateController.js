const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const candidateModel = require('../models/candidateModel');
const assessmentModel = require('../models/assessmentModel');
const verificationModel = require('../models/verificationModel');
const learningCompletionModel = require('../models/learningCompletionModel');

// Ensures the requesting candidate can only access their own resource (unless admin)
function assertOwnCandidateOrAdmin(req, candidateId) {
  if (req.user.role === 'admin') return;
  if (req.user.role !== 'candidate' || Number(req.user.candidateId) !== Number(candidateId)) {
    throw new ApiError(403, 'You can only access your own candidate profile');
  }
}

const getDashboard = asyncHandler(async (req, res) => {
  const candidateId = Number(req.params.id);
  assertOwnCandidateOrAdmin(req, candidateId);

  const candidate = await candidateModel.findById(candidateId);
  if (!candidate) throw new ApiError(404, 'Candidate not found');

  const assessments = await assessmentModel.listByCandidate(candidateId);
  const verification = await verificationModel.listByCandidate(candidateId);
  const completions = await learningCompletionModel.listByCandidate(candidateId);

  res.json({ candidate, assessments, verification, completedLearningModules: completions });
});

const listCandidates = asyncHandler(async (req, res) => {
  const candidates = await candidateModel.listAll();
  res.json({ candidates });
});

module.exports = { getDashboard, listCandidates, assertOwnCandidateOrAdmin };
