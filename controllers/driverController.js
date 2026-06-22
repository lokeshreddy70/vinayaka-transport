const pool = require('../config/db');

// Driver completes vehicle registration after signing up as a user
async function registerVehicle(req, res) {
  try {
    const userId = req.user.id;
    const { vehicle_type, vehicle_number, license_number, home_hub_id } = req.body;

    if (!vehicle_type || !vehicle_number || !license_number) {
      return res.status(400).json({ error: 'vehicle_type, vehicle_number and license_number are required' });
    }

    const existing = await pool.query('SELECT id FROM drivers WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Driver profile already exists for this user' });
    }

    const result = await pool.query(
      `INSERT INTO drivers (user_id, vehicle_type, vehicle_number, license_number, home_hub_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, vehicle_type, vehicle_number, license_number, home_hub_id || null]
    );

    res.status(201).json({
      ...result.rows[0],
      note: 'Driver registered. Awaiting admin approval before they can go online.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register vehicle' });
  }
}

// Admin: approve a driver so they can start accepting orders
async function approveDriver(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE drivers SET is_approved = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve driver' });
  }
}

// Driver: go online/offline, update current location
async function updateStatus(req, res) {
  try {
    const userId = req.user.id;
    const { status, current_lat, current_lng } = req.body;

    const driverRes = await pool.query('SELECT * FROM drivers WHERE user_id = $1', [userId]);
    if (driverRes.rows.length === 0) return res.status(404).json({ error: 'Driver profile not found' });
    const driver = driverRes.rows[0];

    if (status === 'online' && !driver.is_approved) {
      return res.status(403).json({ error: 'Driver not yet approved by admin' });
    }

    const result = await pool.query(
      `UPDATE drivers SET
        status = $1,
        current_lat = $2,
        current_lng = $3
       WHERE user_id = $4 RETURNING *`,
      [status || driver.status, current_lat ?? driver.current_lat, current_lng ?? driver.current_lng, userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update driver status' });
  }
}

// Admin: list all drivers (with filters)
async function listDrivers(req, res) {
  try {
    const { status, vehicle_type, approved } = req.query;
    const conditions = [];
    const values = [];

    if (status) { values.push(status); conditions.push(`d.status = $${values.length}`); }
    if (vehicle_type) { values.push(vehicle_type); conditions.push(`d.vehicle_type = $${values.length}`); }
    if (approved !== undefined) { values.push(approved === 'true'); conditions.push(`d.is_approved = $${values.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT d.*, u.name, u.phone FROM drivers d
       JOIN users u ON u.id = d.user_id
       ${where} ORDER BY d.id`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
}

module.exports = { registerVehicle, approveDriver, updateStatus, listDrivers };
