-- Podalakur Transport — Database Schema
-- Run: psql -U postgres -d your_db -f schema.sql

CREATE TYPE user_role AS ENUM ('customer', 'driver', 'admin');
CREATE TYPE vehicle_type AS ENUM ('bike', 'auto', 'car');
CREATE TYPE driver_status AS ENUM ('offline', 'online', 'on_trip');
CREATE TYPE order_status AS ENUM (
  'pending',      -- created, looking for driver
  'assigned',     -- driver accepted
  'picked_up',
  'in_transit',
  'delivered',
  'cancelled'
);

-- ========== USERS ==========
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== HUBS (Nellore, Podalakur, Tirupati) ==========
CREATE TABLE hubs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,            -- e.g. "Nellore", "Podalakur", "Tirupati"
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_km DOUBLE PRECISION NOT NULL DEFAULT 8,  -- admin-configurable delivery range
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Which hub pairs are allowed for inter-hub trips
-- e.g. Nellore<->Podalakur, Podalakur<->Tirupati, Nellore<->Tirupati
CREATE TABLE hub_routes (
  id SERIAL PRIMARY KEY,
  hub_a_id INTEGER REFERENCES hubs(id) ON DELETE CASCADE,
  hub_b_id INTEGER REFERENCES hubs(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE (hub_a_id, hub_b_id)
);

-- ========== PRICING (admin-configurable, per vehicle type) ==========
CREATE TABLE pricing (
  id SERIAL PRIMARY KEY,
  vehicle_type vehicle_type NOT NULL UNIQUE,
  base_fare NUMERIC(10,2) NOT NULL,        -- flat starting fare
  per_km_rate NUMERIC(10,2) NOT NULL,      -- rate per km
  min_fare NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  max_weight_kg NUMERIC(6,2),              -- null = no limit (e.g. car)
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== DRIVERS ==========
CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  vehicle_type vehicle_type NOT NULL,
  vehicle_number VARCHAR(20) NOT NULL,
  license_number VARCHAR(30) NOT NULL,
  home_hub_id INTEGER REFERENCES hubs(id),
  status driver_status NOT NULL DEFAULT 'offline',
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  is_approved BOOLEAN DEFAULT FALSE,       -- admin approves before driver can go online
  rating NUMERIC(2,1) DEFAULT 5.0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== ORDERS ==========
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES users(id),
  driver_id INTEGER REFERENCES drivers(id),
  vehicle_type vehicle_type NOT NULL,

  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,

  drop_address TEXT NOT NULL,
  drop_lat DOUBLE PRECISION NOT NULL,
  drop_lng DOUBLE PRECISION NOT NULL,

  distance_km NUMERIC(6,2) NOT NULL,
  fare NUMERIC(10,2) NOT NULL,

  package_note TEXT,                       -- "documents", "groceries", "20kg box" etc.
  status order_status NOT NULL DEFAULT 'pending',

  created_at TIMESTAMP DEFAULT NOW(),
  assigned_at TIMESTAMP,
  picked_up_at TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE INDEX idx_drivers_status_vehicle ON drivers(status, vehicle_type);
CREATE INDEX idx_orders_status ON orders(status);

-- Seed: your three hubs
INSERT INTO hubs (name, latitude, longitude, radius_km) VALUES
  ('Nellore', 14.4426, 79.9865, 10),
  ('Podalakur', 14.3167, 79.7833, 8),
  ('Tirupati', 13.6288, 79.4192, 12);

-- Seed: allowed inter-hub routes
INSERT INTO hub_routes (hub_a_id, hub_b_id) VALUES
  (1, 2), -- Nellore <-> Podalakur
  (2, 3), -- Podalakur <-> Tirupati
  (1, 3); -- Nellore <-> Tirupati

-- Seed: starter pricing (edit via admin API later)
INSERT INTO pricing (vehicle_type, base_fare, per_km_rate, min_fare, commission_percent, max_weight_kg) VALUES
  ('bike', 20.00, 6.00, 30.00, 15.00, 10),
  ('auto', 35.00, 9.00, 50.00, 15.00, 50),
  ('car',  60.00, 13.00, 100.00, 18.00, NULL);
