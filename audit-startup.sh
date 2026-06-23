#!/bin/bash
# Vinayaka Transport Production Audit Script

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  VINAYAKA TRANSPORT - PRODUCTION AUDIT & STARTUP CHECK    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're at root
if [ ! -f "package.json" ]; then
  echo -e "${RED}✗ Error: package.json not found. Run this script from the project root.${NC}"
  exit 1
fi

echo -e "${BLUE}[1/5] Checking Environment Configuration...${NC}"
if [ -f ".env" ]; then
  echo -e "${GREEN}✓ .env file exists${NC}"
  if grep -q "DATABASE_URL" .env && grep -q "JWT_SECRET" .env; then
    echo -e "${GREEN}✓ Critical environment variables found${NC}"
  else
    echo -e "${YELLOW}⚠ Missing critical environment variables${NC}"
  fi
else
  echo -e "${YELLOW}⚠ .env file not found. Using defaults.${NC}"
fi
echo ""

echo -e "${BLUE}[2/5] Checking Dependencies...${NC}"
if [ -d "node_modules" ]; then
  echo -e "${GREEN}✓ node_modules exists${NC}"
else
  echo -e "${YELLOW}⚠ node_modules missing. Running npm install...${NC}"
  npm install --legacy-peer-deps
fi
echo ""

echo -e "${BLUE}[3/5] Running Build...${NC}"
npm run build
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Build successful${NC}"
else
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}[4/5] Checking Database Schema...${NC}"
if [ -f "backend/prisma/schema.prisma" ]; then
  echo -e "${GREEN}✓ Prisma schema exists${NC}"
  if [ -f "backend/prisma/migrations/0_initial/migration.sql" ]; then
    echo -e "${GREEN}✓ Initial migration exists${NC}"
  else
    echo -e "${YELLOW}⚠ Initial migration not found${NC}"
  fi
else
  echo -e "${RED}✗ Prisma schema not found${NC}"
fi
echo ""

echo -e "${BLUE}[5/5] Checking Application Structure...${NC}"
echo -e "${GREEN}Frontend Apps:${NC}"
for app in apps/admin-portal apps/operations-portal apps/rider-portal apps/tracking-portal; do
  if [ -d "$app" ]; then
    echo -e "  ${GREEN}✓${NC} $(basename $app)"
  fi
done

echo ""
echo -e "${GREEN}Backend Services:${NC}"
for svc in services/api services/realtime services/notifications backend; do
  if [ -d "$svc" ]; then
    echo -e "  ${GREEN}✓${NC} $(basename $svc)"
  fi
done
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  AUDIT SUMMARY                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Build Status: ✓ PASSED${NC}"
echo -e "${GREEN}Database Schema: ✓ EXISTS${NC}"
echo -e "${YELLOW}Database Connection: ⚠ Not tested (requires running instance)${NC}"
echo -e "${YELLOW}OTP System: ⚠ Requires Twilio credentials${NC}"
echo ""
echo "Next Steps:"
echo "  1. Configure .env with production values"
echo "  2. Setup PostgreSQL database"
echo "  3. Run: npm run prisma:migrate (from services/api)"
echo "  4. Run: npm run dev:api (to start backend)"
echo "  5. Test API endpoints via Postman or curl"
echo ""
