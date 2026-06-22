# API Specification (Phase 1)

## Standards
- Base path: /v1
- Auth: Bearer JWT
- Validation: class-validator DTOs
- Docs: Swagger at /v1/docs
- Pagination: page, limit
- Sorting: sortBy, sortOrder
- Filtering: branchId, status, dateFrom, dateTo

## Auth
- POST /v1/auth/login
- POST /v1/auth/refresh
- POST /v1/auth/logout

## Branch and Pricing
- GET /v1/branches
- POST /v1/branches
- PATCH /v1/branches/:id
- GET /v1/pricing-rules
- POST /v1/pricing-rules
- PATCH /v1/pricing-rules/:id

## Booking and Orders
- POST /v1/orders/quote
- POST /v1/orders
- GET /v1/orders
- GET /v1/orders/:id
- PATCH /v1/orders/:id/status
- POST /v1/orders/:id/assignments

## Parcel and Storage
- POST /v1/parcels/:id/scan
- PATCH /v1/parcels/:id/storage-location

## Rider
- GET /v1/riders/nearby
- PATCH /v1/riders/:id/status
- POST /v1/riders/:id/location

## Tracking
- GET /v1/tracking/:trackingNumber
- GET /v1/tracking/:trackingNumber/timeline

## Settlement and COD
- POST /v1/cod/collect
- GET /v1/settlements
- POST /v1/settlements/close

## Complaints and Fraud
- POST /v1/complaints
- GET /v1/fraud-alerts
- POST /v1/fraud-alerts
