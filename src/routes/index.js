const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/candidates', require('./candidateRoutes'));
router.use('/tasks', require('./taskRoutes'));
router.use('/assessments', require('./assessmentRoutes'));
router.use('/learning', require('./learningRoutes'));
router.use('/employer', require('./employerRoutes'));
router.use('/audit-logs', require('./auditRoutes'));

module.exports = router;
