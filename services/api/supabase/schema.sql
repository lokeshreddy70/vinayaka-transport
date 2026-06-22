-- Vinayaka Transport Supabase Schema
-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

create type app_role as enum ('customer', 'driver', 'operations_staff', 'admin');
create type vehicle_kind as enum ('bike', 'auto', 'car');
create type booking_status as enum (
  'booked',
  'assigned',
  'accepted',
  'started',
  'pickup_complete',
  'in_transit',
  'delivered',
  'cancelled',
  'rejected'
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  full_name text not null,
  email text not null unique,
  phone text,
  role app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_km double precision not null check (radius_km > 0),
  manager_user_id uuid references users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_type vehicle_kind not null,
  registration_no text not null unique,
  model_name text,
  capacity_kg numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  license_no text,
  status text not null default 'offline',
  current_lat double precision,
  current_lng double precision,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pricing_rules (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  vehicle_type vehicle_kind not null,
  base_fare numeric(10,2) not null,
  per_km_rate numeric(10,2) not null,
  min_fare numeric(10,2) not null,
  commission_percent numeric(5,2) not null,
  cod_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(branch_id, vehicle_type)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  tracking_id text not null unique,
  customer_user_id uuid not null references users(id) on delete restrict,
  branch_id uuid not null references branches(id) on delete restrict,
  sender_name text not null,
  sender_phone text not null,
  receiver_name text not null,
  receiver_phone text not null,
  pickup_address text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  drop_address text not null,
  drop_lat double precision not null,
  drop_lng double precision not null,
  vehicle_type vehicle_kind not null,
  parcel_weight_kg numeric(10,2),
  parcel_notes text,
  cod_required boolean not null default false,
  cod_amount numeric(10,2),
  status booking_status not null default 'booked',
  estimated_arrival_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id) on delete cascade,
  driver_id uuid references drivers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  assigned_by_user_id uuid references users(id) on delete set null,
  status booking_status not null default 'assigned',
  fare_amount numeric(10,2),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tracking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  status booking_status not null,
  message text not null,
  latitude double precision,
  longitude double precision,
  location_label text,
  event_time timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  amount numeric(10,2) not null,
  method text,
  provider_reference text,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  trip_id uuid references trips(id) on delete set null,
  photo_url text,
  signature_url text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  raised_by_user_id uuid references users(id) on delete set null,
  title text not null,
  description text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  title text not null,
  body text not null,
  channel text not null default 'in_app',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  resource text not null,
  resource_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on users;
create trigger users_updated_at before update on users for each row execute function set_updated_at();

drop trigger if exists branches_updated_at on branches;
create trigger branches_updated_at before update on branches for each row execute function set_updated_at();

drop trigger if exists vehicles_updated_at on vehicles;
create trigger vehicles_updated_at before update on vehicles for each row execute function set_updated_at();

drop trigger if exists drivers_updated_at on drivers;
create trigger drivers_updated_at before update on drivers for each row execute function set_updated_at();

drop trigger if exists pricing_rules_updated_at on pricing_rules;
create trigger pricing_rules_updated_at before update on pricing_rules for each row execute function set_updated_at();

drop trigger if exists bookings_updated_at on bookings;
create trigger bookings_updated_at before update on bookings for each row execute function set_updated_at();

drop trigger if exists trips_updated_at on trips;
create trigger trips_updated_at before update on trips for each row execute function set_updated_at();

drop trigger if exists payments_updated_at on payments;
create trigger payments_updated_at before update on payments for each row execute function set_updated_at();

drop trigger if exists complaints_updated_at on complaints;
create trigger complaints_updated_at before update on complaints for each row execute function set_updated_at();

alter table users enable row level security;
alter table drivers enable row level security;
alter table vehicles enable row level security;
alter table branches enable row level security;
alter table bookings enable row level security;
alter table trips enable row level security;
alter table tracking_events enable row level security;
alter table payments enable row level security;
alter table pricing_rules enable row level security;
alter table delivery_proofs enable row level security;
alter table complaints enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

create policy users_self_read on users
for select
using (auth.uid() = auth_user_id);

create policy users_self_update on users
for update
using (auth.uid() = auth_user_id);

create policy bookings_customer_access on bookings
for select
using (
  customer_user_id in (
    select id from users where auth_user_id = auth.uid()
  )
);

create policy tracking_events_customer_access on tracking_events
for select
using (
  booking_id in (
    select b.id
    from bookings b
    join users u on u.id = b.customer_user_id
    where u.auth_user_id = auth.uid()
  )
);

create policy notifications_user_access on notifications
for select
using (
  user_id in (
    select id from users where auth_user_id = auth.uid()
  )
);
