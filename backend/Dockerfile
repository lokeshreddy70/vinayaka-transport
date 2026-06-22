FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm ci --include-workspace-root --workspace=backend

COPY backend ./backend

RUN npm run prisma:generate --workspace=backend
RUN npm run build --workspace=backend

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm ci --omit=dev --include-workspace-root --workspace=backend

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/node_modules/.prisma ./backend/node_modules/.prisma

ENV NODE_ENV=production

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start", "--workspace=backend"]
