const pool = require('../config/db');

// Public: list active hubs (for customer app to show pickup/drop options)
async function listHubs(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, latitude, longitude, radius_km, is_active FROM hubs ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch hubs' });
  }
}

// Admin: create a new hub
async function createHub(req, res) {
  try {
    const { name, latitude, longitude, radius_km } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'name, latitude and longitude are required' });
    }
    const result = await pool.query(
      `INSERT INTO hubs (name, latitude, longitude, radius_km)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, latitude, longitude, radius_km || 8]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create hub' });
  }
}

// Admin: update a hub's radius / active status / coordinates
// This is the "select delivery range as admin" control you asked for.
async function updateHub(req, res) {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, radius_km, is_active } = req.body;

    const existing = await pool.query('SELECT * FROM hubs WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Hub not found' });
    }
    const current = existing.rows[0];

    const result = await pool.query(
      `UPDATE hubs SET
        name = $1, latitude = $2, longitude = $3, radius_km = $4, is_active = $5
       WHERE id = $6 RETURNING *`,
      [
        name ?? current.name,
        latitude ?? current.latitude,
        longitude ?? current.longitude,
        radius_km ?? current.radius_km,
        is_active ?? current.is_active,
        id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update hub' });
  }
}

// Admin: enable/disable an inter-hub route (e.g. Nellore <-> Podalakur)
async function setHubRoute(req, res) {
  try {
    const { hub_a_id, hub_b_id, is_active } = req.body;
    if (!hub_a_id || !hub_b_id) {
      return res.status(400).json({ error: 'hub_a_id and hub_b_id are required' });
    }
    const result = await pool.query(
      `INSERT INTO hub_routes (hub_a_id, hub_b_id, is_active)
       VALUES ($1, $2, $3)
       ON CONFLICT (hub_a_id, hub_b_id) DO UPDATE SET is_active = $3
       RETURNING *`,
      [hub_a_id, hub_b_id, is_active ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update hub route' });
  }
}

module.exports = { listHubs, createHub, updateHub, setHubRoute };
