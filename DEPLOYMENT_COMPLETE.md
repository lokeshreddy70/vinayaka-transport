# Vinayaka Transport - Complete Setup Guide for Supabase & Vercel

## 🚀 LIVE DEPLOYMENT URLs (All Ready)

| Service | URL | Status |
|---------|-----|--------|
| **Admin Portal** | https://admin-portal-three-pink.vercel.app | ✅ LIVE |
| **Operations Portal** | https://operations-portal-ten.vercel.app | ✅ LIVE |
| **Rider Portal** | https://rider-portal-five.vercel.app | ✅ LIVE |
| **Tracking Portal** | https://tracking-portal-nine.vercel.app | ✅ LIVE |
| **API Service** | https://vinayaka-transport-api.vercel.app | ✅ LIVE |

---

## ⚙️ STEP 1: Create Supabase Project

1. Go to **[supabase.com](https://supabase.com/dashboard)**
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `vinayaka-transport`
   - **Password**: Create a strong password (save it!)
   - **Region**: Choose based on your location
     - Asia: Singapore, Mumbai, Tokyo
     - US: US-East
     - EU: Ireland, Frankfurt
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to initialize

---

## 📋 STEP 2: Get Your Supabase Credentials

Once project is ready:
1. Go to **Project Settings** → **API** (left sidebar)
2. Copy these three values and SAVE THEM:
   - `Project URL` → Use as `SUPABASE_URL`
   - `anon public` → Use as `SUPABASE_ANON_KEY`
   - `service_role secret` → Use as `SUPABASE_SERVICE_ROLE_KEY` ⚠️ KEEP SECRET!

### Example (yours will be different):
```
SUPABASE_URL=https://abcd1234xyz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🗄️ STEP 3: Create Database Schema

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"+ New query"**
3. Copy entire SQL from `services/api/supabase/schema.sql`
   - (File is in your GitHub repo)
4. Paste into the SQL editor
5. Click **"Run"** button
6. ✅ Wait for all tables to be created (green checkmarks)

**Schema includes:**
- ✅ Users, Drivers, Vehicles
- ✅ Branches, Bookings, Trips
- ✅ Pricing Rules, Tracking Events
- ✅ Delivery Proofs, Payments, Complaints
- ✅ Notifications, Audit Logs
- ✅ Row-Level Security (RLS) policies
- ✅ Auto-timestamp triggers

---

## 🔐 STEP 4: Enable Supabase Auth

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is toggled ON
3. Go to **Authentication** → **Settings**
4. JWT Expiry: Set to `3600` (1 hour)
5. Click **Save**

---

## 📝 STEP 5: Set Environment Variables in Vercel

For **EACH** of the 5 Vercel projects, set these env vars:

### For ALL 4 Portals (Admin, Operations, Rider, Tracking):
1. Go to Vercel dashboard
2. Select project (e.g., admin-portal)
3. Go to **Settings** → **Environment Variables**
4. Add:
   ```
   NEXT_PUBLIC_API_URL=https://vinayaka-transport-api.vercel.app
   ```
5. Click **Save** and **Redeploy**

### For API Service:
1. Go to Vercel dashboard
2. Select `vinayaka-transport-api` project
3. Go to **Settings** → **Environment Variables**
4. Add all 3:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
5. Click **Save** and **Redeploy**

---

## ✅ STEP 6: Verify Everything Works

### Test 1: Check API Health
```bash
curl https://vinayaka-transport-api.vercel.app/api/v1/health
```
Should return: `{"status":"ok"}`

### Test 2: Test Admin Login
1. Visit: https://admin-portal-three-pink.vercel.app
2. You'll see login screen
3. Try login with test credentials (you'll create these in Step 7)

### Test 3: Test Tracking (Public)
1. Visit: https://tracking-portal-nine.vercel.app
2. Search box for tracking ID (you'll create bookings in Step 7)
3. Should work without login

---

## 🔧 STEP 7: Create Test Data

After configuring Supabase, create test data:

### Via Admin Portal:
1. Login as admin (email: admin@vinayaka.com, password: Admin@1234)
2. Create a test branch:
   - Name: "Nellore Hub"
   - City: "Nellore"
   - Latitude: 13.6197
   - Longitude: 79.9062
   - Radius: 50 km
3. Create pricing rules:
   - Vehicle: Bike - Base: ₹50, Per-km: ₹2
   - Vehicle: Auto - Base: ₹80, Per-km: ₹3
   - Vehicle: Car - Base: ₹150, Per-km: ₹5
4. Create test users:
   - Driver: driver@vinayaka.com
   - Operations: ops@vinayaka.com
   - Customer: customer@vinayaka.com

### Via Operations Portal:
1. Login as operations_staff (ops@vinayaka.com)
2. Create manual booking:
   - Sender: John Doe (+919999999999)
   - Receiver: Jane Smith (+918888888888)
   - Pickup: Nellore (13.6197, 79.9062)
   - Drop: Podalakur (13.6500, 79.8500)
   - Vehicle: Bike
   - Get tracking ID (displayed after creation)

### Via Tracking Portal:
1. Visit: https://tracking-portal-nine.vercel.app
2. Search for the tracking ID you got
3. Should show booking details, driver info, timeline, delivery proofs

### Via Rider Portal:
1. Login as driver (driver@vinayaka.com)
2. Accept pending trips
3. Update status: Started → Pickup Complete → In Transit → Delivered
4. Upload delivery proof (image URL + signature)
5. Go back to tracking portal to see updated timeline

---

## 🔄 Full End-to-End Flow

```
Admin Creates Infrastructure
├── Branch (Nellore Hub, 50km radius)
├── Pricing Rules (per vehicle type)
└── Test Users (driver, ops, customer)

Operations Staff Books Delivery
├── Creates booking
├── Assigns driver
└── Gets tracking ID

Driver Accepts & Delivers
├── Views trip
├── Updates status
└── Uploads proof

Customer Tracks Shipment
├── Visits public tracking
├── Enters tracking ID
└── Sees full timeline + proof
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **"API not responding"** | Check SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY are set in Vercel |
| **"Login fails"** | Verify Supabase Auth is enabled and email provider is ON |
| **"No branches available"** | Create at least one branch in Admin portal first |
| **"Tracking shows empty"** | Create a booking first, then search with tracking ID |
| **"Rate limit error"** | API has 30 req/min on auth, 120 req/min on others |

---

## 📞 API Documentation

### Public Endpoints (No Auth)

**Tracking:**
```bash
GET https://vinayaka-transport-api.vercel.app/api/v1/tracking/{tracking_id}
```

Response:
```json
{
  "booking": {
    "id": "uuid",
    "tracking_id": "TRACK-XXXXX",
    "status": "in_transit",
    "sender_name": "John",
    "receiver_name": "Jane",
    "pickup_address": "Nellore",
    "drop_address": "Podalakur"
  },
  "driver": {
    "name": "Driver Name",
    "phone": "+919999999999",
    "rating": 4.8
  },
  "vehicle": {
    "type": "bike",
    "registration": "TG-01-AB-1234",
    "model": "Hero MotoCorp"
  },
  "timeline": [
    {
      "status": "booked",
      "message": "Booking confirmed",
      "timestamp": "2026-06-22T10:00:00Z"
    }
  ],
  "delivery_proofs": []
}
```

### Protected Endpoints (Bearer Token Auth)

**Login:**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password@123"
}
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "driver"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**All subsequent requests:**
```bash
curl -H "Authorization: Bearer {accessToken}" \
  https://vinayaka-transport-api.vercel.app/api/v1/...
```

---

## 🚀 Summary

| Step | Status | Time |
|------|--------|------|
| Deploy portals | ✅ DONE | 5 min |
| Deploy API | ✅ DONE | 3 min |
| Create Supabase | ⏳ PENDING | 5 min |
| Apply schema | ⏳ PENDING | 2 min |
| Set env vars | ⏳ PENDING | 5 min |
| Test end-to-end | ⏳ PENDING | 10 min |
| **TOTAL** | **~50%** | **~30 min** |

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `services/api/supabase/schema.sql` | Database schema (copy to Supabase SQL editor) |
| `services/api/api/[...all].ts` | All API endpoints (1000+ LOC) |
| `apps/*/src/app/page.tsx` | Portal UIs (login, CRUD operations) |

---

**Generated**: 2026-06-22  
**Project**: Vinayaka Transport - Complete Local Delivery Platform  
**Status**: Ready for production (pending Supabase setup)
