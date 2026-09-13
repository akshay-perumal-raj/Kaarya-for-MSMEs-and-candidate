const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validation/schemas');
const learningController = require('../controllers/learningController');

router.use(requireAuth);

router.get('/', learningController.listModules);
router.post('/complete', validate(schemas.completeLearningModule), learningController.completeModule);

module.exports = router;
