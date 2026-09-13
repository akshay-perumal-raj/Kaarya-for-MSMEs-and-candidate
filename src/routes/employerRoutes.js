const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const schemas = require('../validation/schemas');
const employerController = require('../controllers/employerController');

router.use(requireAuth, roleGuard('employer', 'admin'));

router.get('/candidates', employerController.getPipeline);
router.get('/candidates/:id/report', employerController.getCandidateReport);
router.post('/shortlist', validate(schemas.shortlistDecision), employerController.shortlistCandidate);
router.get('/shortlist', employerController.listShortlist);

module.exports = router;
