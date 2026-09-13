const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const schemas = require('../validation/schemas');
const assessmentController = require('../controllers/assessmentController');

router.use(requireAuth);

router.post('/', roleGuard('candidate'), validate(schemas.startAssessment), assessmentController.startAssessment);
router.get('/:id', assessmentController.getAssessment);
router.post(
  '/:id/attempts',
  roleGuard('candidate'),
  validate(schemas.submitAttempt),
  assessmentController.submitAttempt
);
router.post('/:id/reassess', roleGuard('candidate'), assessmentController.startReassessment);

module.exports = router;
