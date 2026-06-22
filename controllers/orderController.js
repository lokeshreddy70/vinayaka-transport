const pool = require('../config/db');
const { getDistanceKm, calculateFare, estimateEtaMinutes, isWithinHub } = require('../utils/distance');

/**
 * Checks if a pickup/drop pair is serviceable:
 * - both points fall within the same active hub's radius, OR
 * - pickup is within one hub and drop within another, AND that hub pair
 *   has an active route in hub_routes (e.g. Nellore <-> Podalakur)
 */
async function findServiceableHubs(pickupLat, pickupLng, dropLat, dropLng) {
  const hubsRes = await pool.query('SELECT * FROM hubs WHERE is_active = TRUE');
  const hubs = hubsRes.rows;

  const pickupHub = hubs.find((h) => isWithinHub(pickupLat, pickupLng, h));
  const dropHub = hubs.find((h) => isWithinHub(dropLat, dropLng, h));

  if (!pickupHub || !dropHub) {
    return { serviceable: false, reason: 'Pickup or drop location is outside our service area.' };
  }

  if (pickupHub.id === dropHub.id) {
    return { serviceable: true, pickupHub, dropHub };
  }

  const routeRes = await pool.query(
    `SELECT * FROM hub_routes
     WHERE is_active = TRUE
       AND ((hub_a_id = $1 AND hub_b_id = $2) OR (hub_a_id = $2 AND hub_b_id = $1))`,
    [pickupHub.id, dropHub.id]
  );

  if (routeRes.rows.length === 0) {
    return {
      serviceable: false,
      reason: `We don't yet run ${pickupHub.name} → ${dropHub.name}. Available routes are admin-configured.`,
    };
  }

  return { serviceable: true, pickupHub, dropHub };
}

// Customer: get a fare quote before booking (no order created yet)
async function getQuote(req, res) {
  try {
    const { pickup_lat, pickup_lng, drop_lat, drop_lng, vehicle_type } = req.body;
    if ([pickup_lat, pickup_lng, drop_lat, drop_lng, vehicle_type].some((v) => v === undefined)) {
      return res.status(400).json({ error: 'pickup_lat, pickup_lng, drop_lat, drop_lng, vehicle_type are required' });
    }

    const serviceability = await findServiceableHubs(pickup_lat, pickup_lng, drop_lat, drop_lng);
    if (!serviceability.serviceable) {
      return res.status(422).json({ error: serviceability.reason });
    }

    const pricingRes = await pool.query('SELECT * FROM pricing WHERE vehicle_type = $1', [vehicle_type]);
    if (pricingRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid vehicle_type' });
    }
    const pricing = pricingRes.rows[0];

    const distanceKm = getDistanceKm(pickup_lat, pickup_lng, drop_lat, drop_lng);
    const fare = calculateFare(distanceKm, pricing);
    const etaMinutes = estimateEtaMinutes(distanceKm, vehicle_type);

    res.json({
      distance_km: Math.round(distanceKm * 100) / 100,
      fare,
      eta_minutes: etaMinutes,
      vehicle_type,
      pickup_hub: serviceability.pickupHub.name,
      drop_hub: serviceability.dropHub.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate quote' });
  }
}

// Finds the nearest available, approved, online driver of the right vehicle type
async function findNearestDriver(pickupLat, pickupLng, vehicleType) {
  const result = await pool.query(
    `SELECT * FROM drivers
     WHERE status = 'online' AND is_approved = TRUE AND vehicle_type = $1
       AND current_lat IS NOT NULL AND current_lng IS NOT NULL`,
    [vehicleType]
  );
  if (result.rows.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;
  for (const driver of result.rows) {
    const d = getDistanceKm(pickupLat, pickupLng, driver.current_lat, driver.current_lng);
    if (d < minDist) {
      minDist = d;
      nearest = driver;
    }
  }
  return nearest;
}

// Customer: create and book an order
async function createOrder(req, res) {
  try {
    const customerId = req.user.id;
    const {
      pickup_address, pickup_lat, pickup_lng,
      drop_address, drop_lat, drop_lng,
      vehicle_type, package_note,
    } = req.body;

    if (!pickup_address || !drop_address || [pickup_lat, pickup_lng, drop_lat, drop_lng, vehicle_type].some((v) => v === undefined)) {
      return res.status(400).json({ error: 'Missing required order fields' });
    }

    const serviceability = await findServiceableHubs(pickup_lat, pickup_lng, drop_lat, drop_lng);
    if (!serviceability.serviceable) {
      return res.status(422).json({ error: serviceability.reason });
    }

    const pricingRes = await pool.query('SELECT * FROM pricing WHERE vehicle_type = $1', [vehicle_type]);
    if (pricingRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid vehicle_type' });
    }
    const pricing = pricingRes.rows[0];

    const distanceKm = getDistanceKm(pickup_lat, pickup_lng, drop_lat, drop_lng);
    const fare = calculateFare(distanceKm, pricing);

    const orderRes = await pool.query(
      `INSERT INTO orders
        (customer_id, vehicle_type, pickup_address, pickup_lat, pickup_lng,
         drop_address, drop_lat, drop_lng, distance_km, fare, package_note, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
       RETURNING *`,
      [customerId, vehicle_type, pickup_address, pickup_lat, pickup_lng,
       drop_address, drop_lat, drop_lng, distanceKm, fare, package_note || null]
    );
    const order = orderRes.rows[0];

    // Try to auto-assign nearest driver
    const driver = await findNearestDriver(pickup_lat, pickup_lng, vehicle_type);
    if (driver) {
      const updated = await pool.query(
        `UPDATE orders SET driver_id = $1, status = 'assigned', assigned_at = NOW()
         WHERE id = $2 RETURNING *`,
        [driver.id, order.id]
      );
      await pool.query(`UPDATE drivers SET status = 'on_trip' WHERE id = $1`, [driver.id]);
      return res.status(201).json({ order: updated.rows[0], driver_assigned: true });
    }

    res.status(201).json({ order, driver_assigned: false, note: 'No drivers online nearby yet — order is pending.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
}

// Driver/Admin: update order status through its lifecycle
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${validStatuses.join(', ')}` });
    }

    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderRes.rows[0];

    const timestampField =
      status === 'picked_up' ? 'picked_up_at' :
      status === 'delivered' ? 'delivered_at' : null;

    const query = timestampField
      ? `UPDATE orders SET status = $1, ${timestampField} = NOW() WHERE id = $2 RETURNING *`
      : `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`;

    const updated = await pool.query(query, [status, id]);

    // Free up the driver once trip ends
    if ((status === 'delivered' || status === 'cancelled') && order.driver_id) {
      await pool.query(`UPDATE drivers SET status = 'online' WHERE id = $1`, [order.driver_id]);
    }

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
}

// Customer: view their own orders
async function listMyOrders(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

// Admin: view all orders
async function listAllOrders(req, res) {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

module.exports = { getQuote, createOrder, updateOrderStatus, listMyOrders, listAllOrders };
