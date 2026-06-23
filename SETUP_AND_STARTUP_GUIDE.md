# VINAYAKA TRANSPORT - SETUP & STARTUP GUIDE

**Quick Links:** [Development Setup](#development-setup) | [Production Deployment](#production-deployment) | [Troubleshooting](#troubleshooting)

---

## SYSTEM REQUIREMENTS

### Minimum Requirements
- Node.js 18+ (recommended 20 LTS)
- PostgreSQL 13+
- npm 9+ or yarn 3+
- 2GB RAM
- 5GB Disk Space

### Development Requirements
- Code Editor (VS Code recommended)
- Postman or curl for API testing
- Git for version control

### Production Requirements
- Docker (optional but recommended)
- SSL Certificate (for HTTPS)
- Cloud infrastructure (Railway, Heroku, AWS, GCP, etc.)
- Email provider (SMTP/SendGrid)
- SMS provider (Twilio, Exotel, etc.)

---

## DEVELOPMENT SETUP

### Step 1: Clone Repository
```bash
git clone https://github.com/vinayaka-transport/vinayaka-transport.git
cd vinayaka-transport
```

### Step 2: Install Dependencies
```bash
# Install with legacy peer deps to avoid conflicts
npm install --legacy-peer-deps

# Or with yarn
yarn install
```

### Step 3: Setup Local Database

#### Option A: Using Docker
```bash
# Start PostgreSQL container
docker run --name vinayaka-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=vinayaka_transport \
  -p 5432:5432 \
  -d postgres:15

# Verify it's running
docker ps
```

#### Option B: Using Local PostgreSQL
```bash
# Create database
createdb vinayaka_transport

# Create user (optional)
createuser vinayaka_user
psql -U postgres -d vinayaka_transport -c "ALTER USER vinayaka_user WITH PASSWORD 'password123';"
```

### Step 4: Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env with local values
cat > .env << EOF
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vinayaka_transport
JWT_SECRET=dev-secret-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-production-min-32-chars
PORT=3001
CORS_ORIGIN=*
OTP_EXPIRY=10
OTP_LENGTH=6

# Optional for development (if you have Twilio)
# TWILIO_ACCOUNT_SID=your_sid
# TWILIO_AUTH_TOKEN=your_token
# TWILIO_PHONE_NUMBER=+1234567890
EOF
```

### Step 5: Setup Database Schema
```bash
# Navigate to backend
cd backend

# Or if using monorepo services
cd services/api

# Generate Prisma client
npm run prisma:generate

# Apply migrations
npm run prisma:migrate

# View database in Prisma Studio (optional)
npm run prisma:studio
```

### Step 6: Start Development Server

#### Backend (API Service)
```bash
# From root directory
npm run dev:api

# Or from services/api
cd services/api
npm run dev

# Output should show:
# 🚀 Vinayaka Transport Backend running on port 3001
```

#### Frontend Apps (in separate terminals)
```bash
# Admin Portal
npm run dev:admin

# Operations Portal
npm run dev:operations

# Rider Portal
npm run dev:rider

# Tracking Portal
npm run dev:tracking
```

### Step 7: Verify Everything is Running
```bash
# Check backend health
curl http://localhost:3001/health

# Expected response:
# {"success":true,"message":"Server is running"}

# Check detailed health
curl http://localhost:3001/health/detailed

# Check frontend apps
open http://localhost:3000  # or your dev port
```

---

## LOCAL TESTING

### Test OTP Flow
```bash
# 1. Send OTP
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999000001"}'

# Response will include OTP in development mode

# 2. Register
curl -X POST http://localhost:3001/api/auth/verify-otp-register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919999000001",
    "otp": "123456",
    "fullName": "Test User",
    "deviceId": "device-001",
    "deviceInfo": "test"
  }'

# 3. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919999000001",
    "otp": "123456",
    "deviceId": "device-002",
    "deviceInfo": "test"
  }'
```

### Test with Postman
1. Import API collection: `API_TESTING_GUIDE.md`
2. Set base URL to `http://localhost:3001`
3. Run collection

---

## PRODUCTION DEPLOYMENT

### Option 1: Railway.app (Easiest for MVP)

#### Prerequisites
- Railway account (railwayapp.com)
- GitHub repository

#### Steps
1. **Connect GitHub:**
   - Login to Railway
   - Click "New Project"
   - Select "Deploy from GitHub repo"

2. **Add PostgreSQL:**
   - Add "PostgreSQL" plugin
   - Note the connection string

3. **Configure Environment:**
   - Add these variables:
   ```
   NODE_ENV=production
   DATABASE_URL=<from PostgreSQL plugin>
   JWT_SECRET=<generate new - min 32 chars>
   JWT_REFRESH_SECRET=<generate new - min 32 chars>
   TWILIO_ACCOUNT_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_PHONE_NUMBER=+1234567890
   CORS_ORIGIN=https://your-domain.com
   ```

4. **Deploy:**
   - Push to GitHub
   - Railway auto-deploys
   - Monitor logs

5. **Migrate Database:**
   ```bash
   railway run npm run prisma:migrate
   ```

### Option 2: Heroku

#### Steps
1. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create App:**
   ```bash
   heroku create vinayaka-transport-api
   ```

3. **Add PostgreSQL:**
   ```bash
   heroku addons:create heroku-postgresql:standard-0 -a vinayaka-transport-api
   ```

4. **Set Environment Variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET="<new-secret-32-chars>"
   heroku config:set JWT_REFRESH_SECRET="<new-secret-32-chars>"
   heroku config:set TWILIO_ACCOUNT_SID="your_sid"
   # ... etc
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

6. **Migrate Database:**
   ```bash
   heroku run npm run prisma:migrate -a vinayaka-transport-api
   ```

### Option 3: AWS EC2

#### Steps
1. **Launch EC2 Instance:**
   - Ubuntu 22.04 LTS
   - t3.micro (free tier) or t3.small
   - Configure security groups for ports 80, 443, 3001

2. **SSH and Setup:**
   ```bash
   ssh -i key.pem ubuntu@instance-ip
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PostgreSQL
   sudo apt install -y postgresql postgresql-contrib
   
   # Start PostgreSQL
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   
   # Create database
   sudo -u postgres createdb vinayaka_transport
   ```

3. **Deploy Application:**
   ```bash
   git clone https://github.com/vinayaka-transport/vinayaka-transport.git
   cd vinayaka-transport
   npm install --legacy-peer-deps
   npm run build
   ```

4. **Setup PM2 (Process Manager):**
   ```bash
   sudo npm install -g pm2
   pm2 start npm --name "vinayaka-api" -- run start:api
   pm2 save
   sudo pm2 startup
   ```

5. **Setup NGINX (Reverse Proxy):**
   ```bash
   sudo apt install -y nginx
   
   # Create config
   sudo tee /etc/nginx/sites-available/vinayaka << EOF
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://127.0.0.1:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade \$http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host \$host;
           proxy_cache_bypass \$http_upgrade;
       }
   }
   EOF
   
   sudo ln -s /etc/nginx/sites-available/vinayaka /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Setup SSL (Let's Encrypt):**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option 4: Docker Deployment

#### Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: vinayaka_transport
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/vinayaka_transport
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    ports:
      - "3001:3001"
    depends_on:
      - db

volumes:
  pgdata:
```

#### Deploy
```bash
docker-compose up -d
docker-compose exec api npm run prisma:migrate
```

---

## MONITORING & MAINTENANCE

### View Logs
```bash
# Local development
npm run dev:api

# Railway
railway logs

# Heroku
heroku logs --tail

# Docker
docker logs -f container-id
```

### Database Maintenance
```bash
# Backup database
pg_dump vinayaka_transport > backup.sql

# Restore database
psql vinayaka_transport < backup.sql

# Connect to database
psql vinayaka_transport
```

### Check Performance
```bash
# View slow queries
curl http://localhost:3001/health/detailed

# Monitor database
npm run prisma:studio
```

---

## TROUBLESHOOTING

### Build Errors

**Error: `Cannot find module '@types/node'`**
```bash
npm install --legacy-peer-deps
npm run build
```

**Error: `Prisma migration failed`**
```bash
# Check current migration status
npm run prisma:migrate

# Reset if needed (dev only!)
npm run db:reset
```

### Runtime Errors

**Error: `ECONNREFUSED - Database connection failed`**
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Verify PostgreSQL is running
psql --version
```

**Error: `JWT_SECRET not configured`**
```bash
# Set environment variable
export JWT_SECRET="your-32-char-secret"
npm run dev:api
```

### OTP Issues

**Error: `OTP delivery failed`**
```bash
# Check Twilio credentials
echo $TWILIO_ACCOUNT_SID

# View logs
npm run dev:api # watch console

# In development, OTP is printed to console
```

### Performance Issues

**Slow API responses**
```bash
# Check database query performance
npm run prisma:studio

# Add indexes if missing (check PRODUCTION_AUDIT_REPORT.md)

# Check connection pool
# Consider adding Redis cache
```

---

## NEXT STEPS

1. **Local Development:**
   - [ ] Run setup steps above
   - [ ] Verify backend health
   - [ ] Test OTP flow
   - [ ] Test order creation

2. **Production Deployment:**
   - [ ] Choose hosting option
   - [ ] Follow deployment steps
   - [ ] Configure environment
   - [ ] Run migrations
   - [ ] Monitor logs

3. **Mobile App:**
   - [ ] Build Android APK with Capacitor
   - [ ] Test on real devices
   - [ ] Prepare Play Store submission

---

## SUPPORT

For issues or questions:
1. Check [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md)
2. See [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)
3. Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
4. Open GitHub issues

---

**Last Updated:** 2026-06-23
**Next Review:** After first production deployment
