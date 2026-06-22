# System Architecture

## Overview
Podalakur Transport uses a modular monorepo architecture with independently deployable services and shared package libraries.

## Components
- apps/admin-portal: Administrative control center.
- apps/operations-portal: Branch operations and counter workflows.
- apps/rider-portal: Installable rider web app with offline support.
- apps/tracking-portal: Public parcel tracking surface.
- services/api: NestJS REST API, Prisma data access, RBAC and validation.
- services/realtime: Socket.IO gateway for rider, dispatch, and tracking events.
- services/notifications: BullMQ workers and provider adapters.
- packages/ui: Shared design system components.
- packages/shared-types: API and domain contracts.
- packages/shared-utils: Shared helper logic.

## Data and Event Flow
1. Portal action invokes services/api endpoint.
2. API writes PostgreSQL transaction and emits domain event.
3. Event is published to Redis (pub/sub and queue).
4. services/realtime pushes updates to subscribed clients.
5. services/notifications consumes event and sends configured channels.

## Bounded Domains
- Identity and Access
- Branch and Pricing
- Booking and Parcel
- Dispatch and Rider
- Settlement and Accounting
- Complaint and Fraud
- Tracking and Proof of Delivery

## Scalability Plan
- Stateless services behind Nginx reverse proxy.
- Horizontal scale API and realtime with sticky sessions for websocket.
- Redis for cache, queue, and socket adapter.
- Read-heavy endpoints cached with branch-aware keys.
