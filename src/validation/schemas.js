const Joi = require('joi');

const register = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('candidate', 'employer').required(),
  companyName: Joi.string().min(2).max(160).when('role', {
    is: 'employer',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const startAssessment = Joi.object({
  taskId: Joi.number().integer().required(),
});

const submitAttempt = Joi.object({
  tool: Joi.string().valid('CNMG Roughing Insert', 'VNMG Finishing Insert').required(),
  spindleSpeedRpm: Joi.number().integer().min(500).max(2500).required(),
  feedRateMmRev: Joi.number().min(0.05).max(0.5).required(),
  depthOfCutMm: Joi.number().min(0.1).max(3.0).required(),
  processSequence: Joi.array()
    .items(Joi.string().valid('Workpiece Setup', 'Rough Turning', 'Finish Turning', 'Measurement'))
    .min(1)
    .required(),
  cycleTimeSeconds: Joi.number().integer().min(0).optional(),
});

const completeLearningModule = Joi.object({
  moduleId: Joi.number().integer().required(),
});

const shortlistDecision = Joi.object({
  candidateId: Joi.number().integer().required(),
  roleId: Joi.number().integer().optional(),
});

module.exports = {
  register,
  login,
  startAssessment,
  submitAttempt,
  completeLearningModule,
  shortlistDecision,
};
