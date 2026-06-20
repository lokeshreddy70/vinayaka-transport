# 🖥️ Local Development Setup (Without Docker)

If Docker is not available or you prefer local development, follow this guide.

---

## Prerequisites

- **Node.js 20 LTS** - [Download](https://nodejs.org/)
- **PostgreSQL 15** - [Download](https://www.postgresql.org/download/)
- **Redis 7** - [Download](https://redis.io/download)

**Verify installations:**
```powershell
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
psql --version    # Should show postgres (PostgreSQL) 15.x
redis-cli --version  # Should show redis-cli 7.x.x
```

---

## Step 1: Set Up PostgreSQL Database

### Windows

1. **Start PostgreSQL:**
   - Open Services (Ctrl+R → services.msc)
   - Find "postgresql-x64-15"
   - Right-click → Start

2. **Create Database:**
```powershell
# Connect to PostgreSQL
psql -U postgres

# In psql:
CREATE USER vinayaka WITH PASSWORD 'secure_password_change_in_prod';
CREATE DATABASE vinayaka_transport OWNER vinayaka;
GRANT ALL PRIVILEGES ON DATABASE vinayaka_transport TO vinayaka;
\q
```

3. **Verify connection:**
```powershell
psql -U vinayaka -d vinayaka_transport -h localhost
# Should connect successfully
```

---

## Step 2: Set Up Redis

### Windows

1. **Download Redis** (or use Windows Subsystem for Linux)
2. **Start Redis server:**
```powershell
redis-server
```

3. **Verify Redis** (in another terminal):
```powershell
redis-cli ping
# Should return: PONG
```

---

## Step 3: Setup Backend

```powershell
cd c:\Users\lokil\Downloads\vinayaka-transport\backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure environment
# Edit .env with your database details:
# DATABASE_URL=postgresql://vinayaka:secure_password_change_in_prod@localhost:5432/vinayaka_transport
# REDIS_URL=redis://localhost:6379

# Run Prisma migrations
npx prisma migrate deploy

# Verify database setup
npx prisma db seed

# Build TypeScript
npm run build

# Start backend server
npm start

# Should show: "Server running on port 3001"
```

---

## Step 4: Setup Frontend

**In another terminal:**

```powershell
cd c:\Users\lokil\Downloads\vinayaka-transport\frontend

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Start development server
npm run dev

# Should show: "ready - started server on 0.0.0.0:3000"
```

---

## Step 5: Verify Everything

### Test Backend
```powershell
# In PowerShell
curl http://localhost:3001/health

# Should return:
# {"status":"ok","timestamp":"2024-01-15T10:30:00Z"}
```

### Test Frontend
```powershell
# Open browser
Start http://localhost:3000

# Should show landing page
```

### Test Database
```powershell
# Connect to database
psql -U vinayaka -d vinayaka_transport

# List tables
\dt

# Should show 60+ tables
```

---

## 🌐 Local URLs

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:3000 | 3000 |
| Backend API | http://localhost:3001 | 3001 |
| PostgreSQL | localhost:5432 | 5432 |
| Redis | localhost:6379 | 6379 |

---

## 🧪 Testing APIs Locally

### 1. Send OTP
```powershell
$body = @{
    phoneNumber = "+919876543210"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri http://localhost:3001/api/auth/send-otp `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

### 2. Verify OTP
```powershell
$body = @{
    phoneNumber = "+919876543210"
    otp = "123456"
    fullName = "Test User"
    deviceId = "device-test"
    deviceInfo = "Windows 11"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri http://localhost:3001/api/auth/verify-otp `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

### 3. Get Customer Profile
```powershell
Invoke-WebRequest `
  -Uri http://localhost:3001/api/customers/profile `
  -Method GET `
  -Headers @{"Authorization"="Bearer YOUR_ACCESS_TOKEN"}
```

---

## 📁 Project Structure

```
vinayaka-transport/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .env
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── customer/
│   │   ├── rider/
│   │   └── admin/
│   ├── components/
│   ├── styles/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .env.local
│
└── [Configuration files and docs]
```

---

## 🆘 Troubleshooting

### Backend Won't Start
```powershell
# Check if port 3001 is in use
netstat -ano | findstr :3001

# Kill process using port
taskkill /PID <PID> /F

# Or change port in backend/.env
```

### Database Connection Error
```powershell
# Verify PostgreSQL is running
psql -U vinayaka -d vinayaka_transport

# Check DATABASE_URL in backend/.env
# Format: postgresql://user:password@localhost:5432/database
```

### Redis Connection Error
```powershell
# Verify Redis is running
redis-cli ping

# Should return: PONG
```

### Frontend Won't Load
```powershell
# Clear Next.js cache
cd frontend
rm -r .next node_modules
npm install
npm run dev
```

---

## ✨ Features to Test

### Customer Features
1. **Signup/Login**
   - Visit http://localhost:3000
   - Enter phone number
   - Enter OTP (check console for test OTP)
   - Create account

2. **Book Parcel**
   - Click "Send Parcel"
   - Fill 4-step form
   - View estimated price
   - Submit order

3. **Track Order**
   - View order in dashboard
   - Click to see real-time tracking
   - See delivery status

4. **Wallet**
   - View wallet balance
   - See transaction history
   - Check loyalty points

### Rider Features
1. **Registration**
   - Go to /rider page
   - Upload Aadhaar, License, RC
   - Wait for approval

2. **Accept Orders**
   - Go online in dashboard
   - See nearby orders
   - Click Accept
   - Get route for delivery

3. **Track Earnings**
   - View today's earnings
   - See completed deliveries
   - Check weekly graph

### Admin Features
1. **Analytics Dashboard**
   - View revenue stats
   - See orders graph
   - Monitor riders
   - Check growth metrics

2. **Order Management**
   - View all orders
   - Filter by status
   - See delivery details

3. **Rider Management**
   - View all riders
   - Approve/reject new riders
   - Check ratings and earnings

---

## 📊 Database Inspection

```powershell
# Connect to database
psql -U vinayaka -d vinayaka_transport

# Useful commands:
\dt                              # List all tables
\d "User"                        # Describe User table
SELECT * FROM "User" LIMIT 5;   # View users
SELECT * FROM "Order" LIMIT 5;  # View orders
\q                               # Exit
```

---

## 🎯 Development Workflow

### Terminal 1: Backend
```powershell
cd backend
npm run dev    # Watch mode with hot reload
```

### Terminal 2: Frontend
```powershell
cd frontend
npm run dev    # Watch mode with fast refresh
```

### Terminal 3: Database
```powershell
psql -U vinayaka -d vinayaka_transport
```

### Terminal 4: Redis Monitor
```powershell
redis-cli monitor
```

---

## 🚀 Build for Production

```powershell
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm start
```

---

## 📝 Environment Files

### backend/.env
```env
NODE_ENV=development
DATABASE_URL=postgresql://vinayaka:secure_password_change_in_prod@localhost:5432/vinayaka_transport
REDIS_URL=redis://localhost:6379

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

OTP_LENGTH=6
OTP_EXPIRY=10m

PORT=3001
LOG_LEVEL=debug
```

### frontend/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
```

---

## ✅ Checklist

- [ ] Node.js 20 installed
- [ ] PostgreSQL 15 installed and running
- [ ] Redis 7 installed and running
- [ ] Database created
- [ ] Backend dependencies installed
- [ ] Backend migrations run
- [ ] Backend server running on port 3001
- [ ] Frontend dependencies installed
- [ ] Frontend server running on port 3000
- [ ] Can access http://localhost:3000
- [ ] Can access http://localhost:3001/health
- [ ] Can send OTP via API
- [ ] Can create account
- [ ] Can create order
- [ ] Can view dashboard

---

**You're Ready to Develop! 🎉**

All services should now be running locally. Check the logs for any errors and adjust as needed.
