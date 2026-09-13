const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const candidateController = require('../controllers/candidateController');
const assessmentController = require('../controllers/assessmentController');

router.use(requireAuth);

router.get('/', roleGuard('employer', 'admin'), candidateController.listCandidates);
router.get('/me/assessments', roleGuard('candidate'), assessmentController.listMyAssessments);
router.get('/:id/dashboard', candidateController.getDashboard);

module.exports = router;
