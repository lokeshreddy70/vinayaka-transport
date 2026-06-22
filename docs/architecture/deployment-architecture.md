# Deployment Architecture

## Target Topology
- Frontend apps deployed on Vercel.
- services/api, services/realtime, services/notifications deployed on Docker VPS.
- PostgreSQL and Redis on managed or hardened VPS containers.
- Nginx as edge reverse proxy for API and websocket routing.

## Runtime Routing
- api.podalakurtransport.in -> services/api
- rt.podalakurtransport.in -> services/realtime
- notify.podalakurtransport.in -> services/notifications internal admin endpoints

## Environment Isolation
- Local: docker-compose.dev.yml
- Staging: docker-compose.staging.yml
- Production: docker-compose.yml with immutable image tags

## Security Controls
- TLS termination at Nginx.
- JWT short-lived access token + rotating refresh token.
- Strict CORS allowlists for Vercel app origins.
- Rate limiting and IP audit trails.

## Reliability Controls
- Container health checks.
- Restart policy always unless-stopped.
- Scheduled database backups with retention and offsite copy.
- Centralized logs and alerts for 5xx, queue lag, and websocket disconnect spikes.
