const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const auditController = require('../controllers/auditController');

router.use(requireAuth, roleGuard('admin'));
router.get('/', auditController.listAuditLogs);

module.exports = router;
