/**
 * Haversine distance between two lat/lng points, in km.
 * Good enough for fare estimation at this stage. Once you have real usage,
 * swap this for Google Maps Distance Matrix API (road distance, not straight-line)
 * — the function signature below (getDistanceKm) is the only place you'd need to change.
 */
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate fare given distance and a pricing row from the `pricing` table.
 */
function calculateFare(distanceKm, pricingRow) {
  const raw = Number(pricingRow.base_fare) + distanceKm * Number(pricingRow.per_km_rate);
  const fare = Math.max(raw, Number(pricingRow.min_fare));
  return Math.round(fare * 100) / 100;
}

/**
 * Rough ETA estimate in minutes, based on vehicle type average speed.
 * Bike/auto assumed slower in mixed traffic, car slightly faster on highway stretches.
 */
function estimateEtaMinutes(distanceKm, vehicleType) {
  const avgSpeedKmh = { bike: 30, auto: 25, car: 40 }[vehicleType] || 30;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

/**
 * Checks whether a lat/lng point falls within a hub's configured radius.
 */
function isWithinHub(lat, lng, hub) {
  const d = getDistanceKm(lat, lng, hub.latitude, hub.longitude);
  return d <= hub.radius_km;
}

module.exports = { getDistanceKm, calculateFare, estimateEtaMinutes, isWithinHub };
