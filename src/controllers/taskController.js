const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const taskModel = require('../models/taskModel');

const listTasks = asyncHandler(async (req, res) => {
  const tasks = await taskModel.listTasks();
  res.json({ tasks });
});

const getTask = asyncHandler(async (req, res) => {
  const task = await taskModel.findById(Number(req.params.id));
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ task });
});

module.exports = { listTasks, getTask };
