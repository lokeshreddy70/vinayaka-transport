# Database Design

## Engine
- PostgreSQL 16
- Prisma ORM with SQL migrations

## Core Entities
- users, roles, permissions, role_permissions, user_roles
- branches, hubs, pricing_rules
- customers, riders, rider_devices, rider_locations
- orders, parcels, parcel_storage_locations, parcel_scans
- dispatch_assignments, order_events, custody_events
- cod_entries, settlements, expenses, ledger_entries
- complaints, fraud_alerts, audit_logs, notification_logs

## Design Principles
- UUID primary keys for distributed safety.
- Strict foreign key integrity for operational correctness.
- Append-only event tables for auditability.
- Partial indexes for active operational lists.
- Denormalized read fields for timeline and dashboard queries.

## Performance and Partitioning
- Composite indexes on status + branch + timestamps.
- GIN index on searchable text fields where needed.
- Optional monthly partitioning for order_events and audit_logs.
