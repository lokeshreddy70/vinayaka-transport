const pool = require('../config/db');

async function listPricing(req, res) {
  try {
    const result = await pool.query('SELECT * FROM pricing ORDER BY vehicle_type');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
}

// Admin: update pricing for a vehicle type
async function updatePricing(req, res) {
  try {
    const { vehicle_type } = req.params;
    const { base_fare, per_km_rate, min_fare, commission_percent, max_weight_kg } = req.body;

    const existing = await pool.query('SELECT * FROM pricing WHERE vehicle_type = $1', [vehicle_type]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle type not found in pricing table' });
    }
    const current = existing.rows[0];

    const result = await pool.query(
      `UPDATE pricing SET
        base_fare = $1, per_km_rate = $2, min_fare = $3,
        commission_percent = $4, max_weight_kg = $5, updated_at = NOW()
       WHERE vehicle_type = $6 RETURNING *`,
      [
        base_fare ?? current.base_fare,
        per_km_rate ?? current.per_km_rate,
        min_fare ?? current.min_fare,
        commission_percent ?? current.commission_percent,
        max_weight_kg ?? current.max_weight_kg,
        vehicle_type,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
}

module.exports = { listPricing, updatePricing };
