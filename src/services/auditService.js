const auditLogModel = require('../models/auditLogModel');

async function logAction(req, { action, entity, entityId, metadata }) {
  try {
    await auditLogModel.record({
      userId: req.user ? req.user.id : null,
      action,
      entity,
      entityId,
      metadata,
    });
  } catch (err) {
    // Auditing should never break the primary request flow
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAction };
