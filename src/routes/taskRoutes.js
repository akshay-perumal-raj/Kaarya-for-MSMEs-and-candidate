const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const taskController = require('../controllers/taskController');

router.use(requireAuth);

router.get('/', taskController.listTasks);
router.get('/:id', taskController.getTask);

module.exports = router;
