const { query } = require('../config/db');

async function record({ userId, action, entity, entityId, metadata }) {
  const { rows } = await query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId || null, action, entity, entityId || null, metadata ? JSON.stringify(metadata) : null]
  );
  return rows[0];
}

async function listRecent(limit = 100) {
  const { rows } = await query(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = { record, listRecent };
