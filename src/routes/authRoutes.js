const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validation/schemas');

router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);
router.get('/me', requireAuth, authController.me);

module.exports = router;
