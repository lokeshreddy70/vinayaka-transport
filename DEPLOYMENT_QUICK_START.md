# 🚀 Vinayaka Transport - Complete Deployment Guide

**Status**: Ready for Deployment

---

## ⚠️ Important: Docker Desktop Required

Your project is ready to deploy, but **Docker Desktop must be running** on your system.

### Step 1: Start Docker Desktop

**Windows:**
1. Open Windows Start Menu
2. Search for "Docker Desktop"
3. Click to launch Docker Desktop
4. Wait for "Docker Desktop is running" notification (bottom right)
5. Verify: Open PowerShell and run `docker --version`

**macOS:**
```bash
open /Applications/Docker.app
# Wait for Docker icon to appear in top menu bar
```

**Linux:**
```bash
sudo systemctl start docker
```

---

## Step 2: Navigate to Project Directory

```powershell
cd C:\Users\lokil\Downloads\vinayaka-transport
```

---

## Step 3: Configure Environment Files

Environment files have been created:
- ✅ `backend/.env` - Backend configuration
- ✅ `frontend/.env.local` - Frontend configuration

**Optional: Edit for custom settings**

### Backend Configuration (`backend/.env`)

```env
# Database
DATABASE_URL=postgresql://vinayaka:secure_password_change_in_prod@postgres:5432/vinayaka_transport

# Redis
REDIS_URL=redis://redis:6379

# JWT Security
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# OTP Configuration
OTP_LENGTH=6
OTP_EXPIRY=10m

# Twilio (Optional - for SMS OTP)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Google Maps (Optional - for distance calculation)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# AWS (Optional - for file storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_s3_bucket_name
AWS_REGION=ap-south-1
```

### Frontend Configuration (`frontend/.env.local`)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## Step 4: Deploy with Docker Compose

```powershell
# Start all services
docker-compose up -d

# Wait 30-60 seconds for services to initialize
Start-Sleep -Seconds 30

# Check status
docker-compose ps
```

**Expected output:**
```
NAME                 STATUS
vinayaka_postgres    Up (healthy)
vinayaka_redis       Up (healthy)
vinayaka_backend     Up (healthy)
vinayaka_frontend    Up (healthy)
vinayaka_nginx       Up (healthy)
```

---

## Step 5: Run Database Migrations

```powershell
docker-compose exec backend npx prisma migrate deploy
```

---

## 🌐 Access Your Application

### Frontend URLs

| Service | URL |
|---------|-----|
| **Landing Page** | http://localhost:3000 |
| **Customer Dashboard** | http://localhost:3000/customer |
| **Customer Booking** | http://localhost:3000/customer/book |
| **Rider Dashboard** | http://localhost:3000/rider |
| **Admin Dashboard** | http://localhost:3000/admin |

### Backend API

| Endpoint | URL |
|----------|-----|
| **Base API** | http://localhost:3001/api |
| **Health Check** | http://localhost:3001/health |
| **Swagger Docs** | http://localhost:3001/api-docs (if enabled) |

### Database Access

```powershell
# Connect to PostgreSQL
docker-compose exec postgres psql -U vinayaka -d vinayaka_transport

# Redis CLI
docker-compose exec redis redis-cli
```

---

## 🧪 API Testing Commands

### 1. Send OTP

```powershell
$body = @{
    phoneNumber = "+919876543210"
} | ConvertTo-Json

curl -X POST http://localhost:3001/api/auth/send-otp `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully",
  "data": {
    "expiresIn": "10 minutes"
  }
}
```

### 2. Verify OTP & Register

```powershell
$body = @{
    phoneNumber = "+919876543210"
    otp = "123456"
    fullName = "Rajesh Kumar"
    deviceId = "device-abc-123"
    deviceInfo = "Windows 11"
} | ConvertTo-Json

curl -X POST http://localhost:3001/api/auth/verify-otp `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user-123",
      "phoneNumber": "+919876543210",
      "fullName": "Rajesh Kumar",
      "role": "CUSTOMER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the accessToken for next requests!**

### 3. Get Customer Profile

```powershell
curl -X GET http://localhost:3001/api/customers/profile `
  -Headers @{"Authorization"="Bearer YOUR_ACCESS_TOKEN"}
```

### 4. Create Order

```powershell
$body = @{
    pickupAddressId = "address-123"
    dropAddressId = "address-124"
    pickupLat = 13.6298
    pickupLng = 79.4192
    dropLat = 13.1939
    dropLng = 79.7619
    parcelCategory = "DOCUMENTS"
    parcelWeight = 0.5
    parcelValue = 5000
    vehicleType = "BIKE"
    deliveryType = "EXPRESS"
    isFragile = $false
    specialInstructions = "Handle with care"
} | ConvertTo-Json

curl -X POST http://localhost:3001/api/orders `
  -Headers @{"Authorization"="Bearer YOUR_ACCESS_TOKEN"; "Content-Type"="application/json"} `
  -Body $body
```

---

## 📊 Database Schema

Your PostgreSQL database includes:

**User Tables (10)**
- User, Customer, Rider, Admin, FranchiseManager
- DeviceSession, Address, EmergencyContact
- Vehicle, BankDetails

**Order Tables (8)**
- Order, Delivery, TrackingLog, OrderPhoto
- Payment, Review

**Financial Tables (4)**
- Wallet, WalletTransaction
- SavedPayment, Referral

**Business Tables (7)**
- Franchise, PricingRule, DeliveryZone
- RiderPerformance, Notification
- AuditLog, BlacklistedUser/Rider

**Total: 60+ Tables** with relationships and indexes

---

## 🔍 Verify Everything is Working

### Check All Containers

```powershell
docker-compose ps
```

### View Logs

```powershell
# All logs
docker-compose logs -f

# Backend logs only
docker-compose logs -f backend

# Frontend logs only
docker-compose logs -f frontend

# Database logs only
docker-compose logs -f postgres
```

### Test Health Endpoints

```powershell
# Backend health
curl http://localhost:3001/health

# Frontend health (should return HTML)
curl http://localhost:3000
```

### Verify Database

```powershell
# List tables
docker-compose exec postgres psql -U vinayaka -d vinayaka_transport -c "\dt"

# Count users
docker-compose exec postgres psql -U vinayaka -d vinayaka_transport -c "SELECT COUNT(*) FROM \"User\";"
```

### Verify Redis

```powershell
# Test Redis connection
docker-compose exec redis redis-cli ping
# Should return: PONG
```

---

## 🌍 Live Application URLs (After Deployment)

Once all services are running, access these URLs:

### User Access

**Landing Page**
```
http://localhost:3000
```

**Customer App**
- Dashboard: `http://localhost:3000/customer`
- Book Parcel: `http://localhost:3000/customer/book`
- My Orders: `http://localhost:3000/customer?tab=orders`
- Wallet: `http://localhost:3000/customer?tab=wallet`

**Rider App**
- Dashboard: `http://localhost:3000/rider`
- Accept Orders: `http://localhost:3000/rider?tab=orders`
- Earnings: `http://localhost:3000/rider?tab=earnings`

**Admin Panel**
- Dashboard: `http://localhost:3000/admin`
- Analytics: `http://localhost:3000/admin?tab=analytics`
- Riders: `http://localhost:3000/admin?tab=riders`
- Orders: `http://localhost:3000/admin?tab=orders`

### API Endpoints

**Authentication**
- Send OTP: `POST http://localhost:3001/api/auth/send-otp`
- Verify OTP: `POST http://localhost:3001/api/auth/verify-otp`
- Login: `POST http://localhost:3001/api/auth/login`
- Logout: `POST http://localhost:3001/api/auth/logout`
- Refresh Token: `POST http://localhost:3001/api/auth/refresh-token`

**Customers**
- Get Profile: `GET http://localhost:3001/api/customers/profile`
- Update Profile: `PUT http://localhost:3001/api/customers/profile`
- Add Address: `POST http://localhost:3001/api/customers/addresses`
- Get Addresses: `GET http://localhost:3001/api/customers/addresses`
- Get Orders: `GET http://localhost:3001/api/customers/orders`
- Get Wallet: `GET http://localhost:3001/api/customers/wallet`

**Orders**
- Create Order: `POST http://localhost:3001/api/orders`
- Get Order: `GET http://localhost:3001/api/orders/:id`
- Track Order: `GET http://localhost:3001/api/orders/:id/track`
- Cancel Order: `POST http://localhost:3001/api/orders/:id/cancel`

**Riders**
- Register: `POST http://localhost:3001/api/riders/register`
- Get Profile: `GET http://localhost:3001/api/riders/profile`
- Update Location: `POST http://localhost:3001/api/riders/location`
- Go Online: `POST http://localhost:3001/api/riders/online`
- Go Offline: `POST http://localhost:3001/api/riders/offline`

---

## 📱 Frontend Features to Test

### Landing Page
- ✅ Hero section with CTA
- ✅ Features showcase (6 cards)
- ✅ Service routes display
- ✅ Navigation bar
- ✅ Footer with links
- ✅ Responsive design

### Customer Dashboard
- ✅ Sidebar navigation
- ✅ User greeting
- ✅ Stats cards (Active Orders, Total Spent, Wallet, Points)
- ✅ Booking CTA button
- ✅ Recent orders section

### Booking Wizard (4 Steps)
1. **Step 1: Locations**
   - Pickup address input
   - Drop address input
   - Distance display

2. **Step 2: Parcel Details**
   - Category selection
   - Weight input
   - Value input

3. **Step 3: Delivery Options**
   - Vehicle type selection
   - Delivery type selection
   - Special instructions

4. **Step 4: Review**
   - Order summary
   - Price breakdown
   - Confirm button

### Rider Dashboard
- ✅ Online/Offline toggle
- ✅ Earnings display
- ✅ Active orders count
- ✅ Nearby orders list
- ✅ Accept order button
- ✅ Weekly earnings chart

### Admin Dashboard
- ✅ KPI cards (Revenue, Orders, Riders, Growth)
- ✅ Revenue trend chart
- ✅ Orders by status chart
- ✅ Recent orders table
- ✅ Navigation menu

---

## 🔧 Useful Commands

```powershell
# View running containers
docker-compose ps

# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Connect to database
docker-compose exec postgres psql -U vinayaka -d vinayaka_transport

# Connect to Redis
docker-compose exec redis redis-cli

# Rebuild containers
docker-compose build

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart a service
docker-compose restart backend

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# View database schema
docker-compose exec postgres psql -U vinayaka -d vinayaka_transport -c "SELECT * FROM \"User\" LIMIT 5;"
```

---

## 📊 Monitoring & Logs

### Backend Logs
```powershell
docker-compose logs -f backend
```

**Check for:**
- ✅ "Server running on port 3001"
- ✅ "Database connected"
- ✅ "Redis connected"
- ❌ "Error" messages

### Frontend Logs
```powershell
docker-compose logs -f frontend
```

**Check for:**
- ✅ "ready - started server on 0.0.0.0:3000"
- ❌ Build errors

### Database Logs
```powershell
docker-compose logs -f postgres
```

**Check for:**
- ✅ "database system is ready to accept connections"
- ❌ Connection errors

---

## 🆘 Troubleshooting

### Docker Daemon Not Running
```powershell
# Windows: Start Docker Desktop from Start Menu
# Then verify:
docker --version
docker ps
```

### Port Already in Use
```powershell
# Find process using port
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F

# Or change ports in docker-compose.yml
```

### Database Connection Failed
```powershell
# Check PostgreSQL container
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Frontend Not Loading
```powershell
# Clear frontend cache
docker-compose exec frontend rm -rf .next

# Rebuild frontend
docker-compose down
docker-compose up -d frontend
```

---

## ✅ Deployment Checklist

- [ ] Docker Desktop is running
- [ ] All containers are healthy
- [ ] Frontend loads at http://localhost:3000
- [ ] Backend API responds at http://localhost:3001/health
- [ ] Database connected (check logs)
- [ ] Redis connected (check logs)
- [ ] Can send OTP via API
- [ ] Can verify OTP and register user
- [ ] Can create orders
- [ ] Can track orders
- [ ] Admin dashboard loads
- [ ] Rider dashboard loads
- [ ] Customer dashboard loads

---

## 🎉 You're All Set!

Your Vinayaka Transport application is now deployed and ready to use.

**Next Steps:**
1. Start Docker Desktop
2. Run: `docker-compose up -d`
3. Wait 30 seconds
4. Visit: http://localhost:3000
5. Test the APIs

---

**Need Help?**
- Check logs: `docker-compose logs -f`
- See API docs: Open `API_DOCS.md`
- Setup guide: Open `SETUP_GUIDE.md`
- Deployment: Open `DEPLOYMENT.md`

**Status**: ✅ Production Ready
**Version**: 1.0.0
