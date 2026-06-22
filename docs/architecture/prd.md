# Podalakur Transport PRD

## 1. Product Vision
Podalakur Transport is a logistics operating system for branch-driven courier and local delivery operations in Podalakur, Nellore, and Tirupati with planned expansion across Andhra Pradesh and India.

## 2. Business Goals
- Reduce booking-to-dispatch turnaround time to under 5 minutes.
- Provide branch-level control of operations, pricing, and settlements.
- Ensure full parcel lifecycle traceability with scan and custody history.
- Support 1000+ concurrent users in Phase 1.

## 3. Product Scope (Phase 1)
- Admin Portal
- Operations Counter Portal
- Rider Portal (PWA)
- Public Tracking Portal
- Shared API service
- Shared PostgreSQL database
- Shared realtime service
- Shared notification service

## 4. User Roles
- SUPER_ADMIN
- ADMIN
- BRANCH_MANAGER
- COUNTER_STAFF
- DISPATCHER
- RIDER
- ACCOUNTANT

## 5. Functional Requirements
### 5.1 Booking
- Capture sender/receiver identity, contacts, and addresses.
- Capture parcel metadata (weight, type, fragile, medicine, COD).
- Auto-calculate price using branch pricing rules.
- Generate tracking number, QR code, barcode, printable receipt.

### 5.2 Operations
- Dispatch queue by status and SLA.
- Bulk rider assignment.
- Rider recommendations by distance and workload.
- Parcel storage mapping to rack/shelf/slot.
- Daily branch cash and COD closeout.

### 5.3 Rider
- OTP login and device binding.
- Accept/reject assignments.
- Pickup and delivery proof capture (images, signature, OTP).
- GPS location updates and geofence validation.

### 5.4 Tracking
- Public tracking with timeline and proof of delivery.
- Status updates in near realtime.

### 5.5 Notifications
- SMS, WhatsApp, Email, In-App templates for lifecycle events.

## 6. Non-Functional Requirements
- Security: JWT, refresh token rotation, RBAC, audit logging, rate limiting.
- Performance: indexed queries, Redis cache, pagination, async queues.
- Availability: health checks, containerized deployment, rolling restart.
- Observability: structured logs, metrics endpoint, trace IDs.

## 7. Success Metrics
- 99.5% API uptime.
- < 300 ms median read API latency.
- < 2% failed delivery due to operational errors.
- 100% parcels with custody event history.
