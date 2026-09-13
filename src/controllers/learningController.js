const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const learningModuleModel = require('../models/learningModuleModel');
const learningCompletionModel = require('../models/learningCompletionModel');
const { logAction } = require('../services/auditService');

const listModules = asyncHandler(async (req, res) => {
  const modules = await learningModuleModel.listModules();
  res.json({ modules });
});

// POST /api/learning/complete  { moduleId }
const completeModule = asyncHandler(async (req, res) => {
  if (req.user.role !== 'candidate' || !req.user.candidateId) {
    throw new ApiError(403, 'Only a candidate account can complete learning modules');
  }
  const { moduleId } = req.body;

  const learningModule = await learningModuleModel.findById(moduleId);
  if (!learningModule) throw new ApiError(404, 'Learning module not found');

  const completion = await learningCompletionModel.markCompleted(req.user.candidateId, moduleId);

  await logAction(req, { action: 'COMPLETE_LEARNING_MODULE', entity: 'learning_modules', entityId: moduleId });

  res.status(201).json({ completion });
});

module.exports = { listModules, completeModule };
