#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Vinayaka Transport - Quick Start${NC}\n"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker found${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose found${NC}\n"

# Create environment files
if [ ! -f backend/.env ]; then
    echo -e "${BLUE}📝 Creating backend environment file...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓ Created backend/.env${NC}"
fi

if [ ! -f frontend/.env.local ]; then
    echo -e "${BLUE}📝 Creating frontend environment file...${NC}"
    cp frontend/.env.example frontend/.env.local 2>/dev/null || echo ""
    echo -e "${GREEN}✓ Frontend environment configured${NC}"
fi

# Start services
echo -e "\n${BLUE}🐳 Starting Docker services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "\n${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check services
if docker-compose ps | grep -q "vinayaka_postgres"; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
fi

if docker-compose ps | grep -q "vinayaka_redis"; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis failed to start${NC}"
fi

if docker-compose ps | grep -q "vinayaka_backend"; then
    echo -e "${GREEN}✓ Backend API is running${NC}"
else
    echo -e "${RED}❌ Backend API failed to start${NC}"
fi

if docker-compose ps | grep -q "vinayaka_frontend"; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
fi

# Run migrations
echo -e "\n${BLUE}🗄️  Running database migrations...${NC}"
docker-compose exec -T backend npx prisma migrate deploy 2>/dev/null || echo "Migrations skipped"

echo -e "\n${GREEN}✅ Setup complete!${NC}\n"
echo -e "${BLUE}🌐 Access your application:${NC}"
echo -e "   Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "   API: ${GREEN}http://localhost:3001${NC}"
echo -e "   Admin: ${GREEN}http://localhost/admin${NC}\n"

echo -e "${BLUE}📚 Useful commands:${NC}"
echo -e "   View logs: ${GREEN}docker-compose logs -f${NC}"
echo -e "   Stop services: ${GREEN}docker-compose down${NC}"
echo -e "   Database shell: ${GREEN}docker-compose exec postgres psql -U vinayaka vinayaka_transport${NC}"
