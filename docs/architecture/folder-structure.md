# Monorepo Folder Structure

## Root
- package.json: workspace scripts and dependency orchestration.
- tsconfig.base.json: shared TypeScript compiler defaults.
- turbo.json: pipeline configuration for parallel builds and tests.

## apps
- apps/admin-portal: Next.js admin workspace.
- apps/operations-portal: Next.js branch operations workspace.
- apps/rider-portal: Next.js PWA workspace for riders.
- apps/tracking-portal: Next.js public tracking workspace.

## services
- services/api: NestJS REST API with Prisma PostgreSQL access.
- services/realtime: Socket.IO server for event subscriptions.
- services/notifications: BullMQ worker for SMS/WhatsApp/Email.

## packages
- packages/ui: reusable Tailwind + shadcn style UI primitives.
- packages/shared-types: cross-service TypeScript contracts.
- packages/shared-utils: cross-service utilities.

## infrastructure
- infrastructure/docker: Dockerfiles and compose manifests.
- infrastructure/nginx: reverse proxy and routing config.
- infrastructure/scripts: bootstrap, migration, and backup scripts.

## docs
- docs/architecture: PRD, architecture, roles, deployment.
- docs/database: schema and ER diagram.
- docs/api: endpoint contracts and conventions.
