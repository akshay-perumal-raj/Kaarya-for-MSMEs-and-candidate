const asyncHandler = require('../utils/asyncHandler');
const auditLogModel = require('../models/auditLogModel');

const listAuditLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const logs = await auditLogModel.listRecent(limit);
  res.json({ logs });
});

module.exports = { listAuditLogs };
