# Podalakur Transport — Local Delivery & Ride Backend

A local transport/delivery platform for the Nellore – Podalakur – Tirupati corridor.
Built on the same core model as Rapido/Porter: an asset-light marketplace that matches
customers to nearby drivers, prices by distance + vehicle type, and lets an admin control
service zones and pricing centrally.

## How the real apps work (and how this maps to your build)

| Rapido / Porter concept        | This project                                                  |
|---------------------------------|-----------------------------------------------------------------|
| City-wide service area          | **Hubs**: Nellore, Podalakur, Tirupati — each a center point + admin-set radius (km) |
| Vehicle tiers (bike/auto/cab)    | `vehicle_type` enum: `bike`, `auto`, `car`                     |
| Distance-based fare              | Haversine distance × per-km rate (rate varies by vehicle type) |
| Driver app                       | `drivers` table + driver-facing endpoints (accept/reject/update status) |
| Admin dashboard                  | `/api/admin/*` routes — hubs, pricing, radius, driver approval  |
| Commission / subscription model  | `commission_percent` field per vehicle type, set by admin       |

Rapido and Porter don't own vehicles — they're pure marketplaces. This backend follows
the same pattern: drivers register their own bike/auto/car, you (admin) control the
zones they're allowed to operate in and what they're paid.

## Why hubs + radius (not city-wide zones)

Your corridor isn't a single city — it's three points connected by road. So instead of
one big polygon zone (which is how a metro city app would do it), each hub has its own
radius. An order is only acceptable if **both pickup and drop fall inside an active
hub's radius, or the order is an inter-hub trip** (e.g. Nellore → Podalakur, Podalakur →
Tirupati) explicitly enabled by the admin. This is implemented in `utils/distance.js`
and `controllers/orderController.js`.

## Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: JWT (role-based: `customer`, `driver`, `admin`)
- **Distance/fare**: Haversine formula, no external maps API needed to start (you can
  swap in Google Maps Distance Matrix later for road-distance accuracy — see notes in
  `utils/distance.js`)

## Project structure

```
podalakur-transport/
├── config/
│   └── db.js                # PostgreSQL connection pool
├── models/
│   └── schema.sql            # Full DB schema — run this first
├── middleware/
│   └── auth.js                # JWT verification + role guard
├── utils/
│   └── distance.js            # Haversine distance + fare calculation
├── controllers/
│   ├── authController.js
│   ├── hubController.js       # admin: create/edit hubs & radius
│   ├── pricingController.js   # admin: set per-km / base fare per vehicle type
│   ├── driverController.js    # driver registration, status, location updates
│   └── orderController.js     # order creation, fare quote, assignment, status
├── routes/
│   ├── auth.js
│   ├── hubs.js
│   ├── pricing.js
│   ├── drivers.js
│   └── orders.js
├── server.js
├── .env.example
└── package.json
```

## Setup

```bash
cd podalakur-transport
npm install
cp .env.example .env        # fill in your DB creds + JWT secret
psql -U postgres -d your_db -f models/schema.sql
npm run dev
```

Server runs on `http://localhost:5000` by default.

## Core flows already working

1. **Register/login** as customer, driver, or admin (`POST /api/auth/register`, `/login`)
2. **Admin creates hubs** with center lat/lng + radius (`POST /api/hubs`)
3. **Admin sets pricing** per vehicle type — base fare, per-km rate, commission %
   (`POST /api/pricing`)
4. **Driver registers vehicle** (bike/auto/car) and goes online (`PATCH /api/drivers/status`)
5. **Customer requests a fare quote** (`POST /api/orders/quote`) — pickup, drop, vehicle
   type → returns distance, fare, ETA estimate
6. **Customer books the order** (`POST /api/orders`) — system finds nearest available
   driver of the right vehicle type within range and assigns
7. **Driver accepts/updates order status** (`PATCH /api/orders/:id/status`)

## What's intentionally left for you to build next (in VS Code)

This is the **engine**, not the full product. Left as your next steps:
- Customer & driver mobile apps (React Native — you already have a pattern for this
  from your other apps)
- Live location tracking via WebSockets (Socket.IO scaffolding note left in `server.js`)
- Payments (Razorpay/UPI integration)
- SMS/OTP login instead of password (common for India market)
- Push notifications for order status

See `PROMPT.md` for a ready-to-use prompt to hand to an AI coding agent (Claude Code,
Cursor, etc.) to build the frontend on top of this backend.
