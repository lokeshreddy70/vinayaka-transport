# SUPABASE SETUP - Step-by-Step Manual Guide

## 📋 What You'll Do

This guide walks you through setting up Supabase in 15 minutes. No coding required - just copying and pasting!

---

## ✅ Prerequisites

- Vercel deployment complete ✓ (ALL apps live)
- GitHub account with vinayaka-transport repo ✓
- 15 minutes of time

---

## 🚀 STEP 1: Create Supabase Project (5 minutes)

### 1a. Go to Supabase Dashboard
- Open: https://supabase.com/dashboard
- Sign up or login with GitHub/email

### 1b. Create New Project
- Click blue **"New Project"** button
- Fill in form:
  - **Project Name**: `vinayaka-transport`
  - **Database Password**: Generate strong password (SAVE THIS!)
  - **Region**: Choose your region
    - **Asia**: Singapore, Mumbai, Tokyo
    - **US**: US-East (Virginia)
    - **EU**: Ireland, Frankfurt
    - Recommendation: Singapore for best Asia coverage
  
- Click **"Create new project"**

### 1c. Wait for Initialization
- Status shows: "Initializing..."
- Wait 2-3 minutes
- Status changes to "Active" (green checkmark)

---

## 🔑 STEP 2: Get Your Credentials (2 minutes)

### 2a. Open API Settings
- In left sidebar, click **Settings** (gear icon)
- Click **API** tab
- You'll see three important keys

### 2b. Copy These Values
Create a text file and copy these three values:

**1. Project URL** (looks like: `https://xxxxabcd1234.supabase.co`)
```
Your SUPABASE_URL:
_______________________________________________
```

**2. Anon Public Key** (starts with `eyJ`, ~200 chars)
```
Your SUPABASE_ANON_KEY:
_______________________________________________
```

**3. Service Role Secret Key** (starts with `eyJ`, ~200 chars) ⚠️ KEEP SECRET!
```
Your SUPABASE_SERVICE_ROLE_KEY:
_______________________________________________
```

⚠️ **IMPORTANT**: Service role key is PRIVATE - never share it!

---

## 🗄️ STEP 3: Create Database Tables (3 minutes)

### 3a. Go to SQL Editor
- In Supabase dashboard, click **SQL Editor** (left sidebar)
- Click **"New query"** button

### 3b. Copy Database Schema
1. Open this file in your repo: `services/api/supabase/schema.sql`
2. Select ALL the SQL code (Ctrl+A)
3. Copy it (Ctrl+C)

### 3c. Paste and Run
1. In Supabase SQL editor, paste the SQL (Ctrl+V)
2. Click blue **"Run"** button
3. Wait for success (you'll see checkmarks next to table names)

Expected tables created:
- ✅ users
- ✅ drivers
- ✅ vehicles
- ✅ branches
- ✅ bookings
- ✅ trips
- ✅ pricing_rules
- ✅ tracking_events
- ✅ delivery_proofs
- ✅ payments
- ✅ complaints
- ✅ notifications
- ✅ audit_logs

---

## 🔐 STEP 4: Configure Vercel Environment Variables (5 minutes)

### 4a. For API Service

1. Go to: https://vercel.com/dashboard
2. Find and click project: **vinayaka-transport-api**
3. Click **Settings** tab
4. Click **Environment Variables** (left sidebar)
5. Add 3 variables:

**Add Variable 1:**
- **Key**: `SUPABASE_URL`
- **Value**: (paste your SUPABASE_URL from Step 2)
- Click **Add**

**Add Variable 2:**
- **Key**: `SUPABASE_ANON_KEY`
- **Value**: (paste your SUPABASE_ANON_KEY from Step 2)
- Click **Add**

**Add Variable 3:**
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: (paste your SUPABASE_SERVICE_ROLE_KEY from Step 2)
- Click **Add**

6. After adding all 3, click **Redeploy** button
7. Wait for deployment (1-2 minutes)

### 4b. For Admin Portal

1. Go to: https://vercel.com/dashboard
2. Find and click: **admin-portal** project
3. Click **Settings** → **Environment Variables**
4. Add 1 variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://vinayaka-transport-api.vercel.app`
5. Click **Redeploy**

### 4c. For Operations Portal

1. Go to: https://vercel.com/dashboard
2. Find and click: **operations-portal** project
3. Click **Settings** → **Environment Variables**
4. Add same variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://vinayaka-transport-api.vercel.app`
5. Click **Redeploy**

### 4d. For Rider Portal

1. Go to: https://vercel.com/dashboard
2. Find and click: **rider-portal** project
3. Click **Settings** → **Environment Variables**
4. Add same variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://vinayaka-transport-api.vercel.app`
5. Click **Redeploy**

### 4e. For Tracking Portal

1. Go to: https://vercel.com/dashboard
2. Find and click: **tracking-portal** project
3. Click **Settings** → **Environment Variables**
4. Add same variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://vinayaka-transport-api.vercel.app`
5. Click **Redeploy**

---

## ✅ STEP 5: Verify Everything Works (1 minute)

### 5a. Test API Connectivity
Open terminal/PowerShell and run:
```bash
curl https://vinayaka-transport-api.vercel.app/api/v1/health
```

Expected response:
```
{"status":"ok"}
```

### 5b. Test Admin Portal
- Visit: https://admin-portal-three-pink.vercel.app
- Should load without errors
- You'll see login screen

### 5c. Test Public Tracking
- Visit: https://tracking-portal-nine.vercel.app
- Should load search box (no auth required)
- Search for tracking ID (you'll create bookings later)

---

## 🎯 STEP 6: Create Test Data

### 6a. Login to Admin Portal
1. Visit: https://admin-portal-three-pink.vercel.app
2. In Supabase, you need to create an admin user first

**Create admin user via Supabase:**
1. Go to Supabase dashboard
2. Click **Authentication** (left sidebar)
3. Click **Users** tab
4. Click **Add user** button
5. Fill in:
   - Email: `admin@vinayaka.com`
   - Password: `Admin@1234`
6. Click **Create user**

Now you can login!

### 6b. Create Infrastructure in Admin Portal
1. Login: admin@vinayaka.com / Admin@1234
2. In left menu, click **Branches**
3. Create a branch:
   - **Name**: Nellore Hub
   - **City**: Nellore
   - **Latitude**: 13.6197
   - **Longitude**: 79.9062
   - **Radius (km)**: 50
   - Click **Create**

4. Create pricing rules:
   - Click **Pricing Rules**
   - Add Bike: Base ₹50, Per-km ₹2
   - Add Auto: Base ₹80, Per-km ₹3
   - Add Car: Base ₹150, Per-km ₹5

### 6c. Create Test Users
1. In Admin Portal, click **Users**
2. Create 3 test users:
   - **Driver**: driver@vinayaka.com (Role: driver)
   - **Operations**: ops@vinayaka.com (Role: operations_staff)
   - **Customer**: customer@vinayaka.com (Role: customer)

### 6d. Create Booking in Operations Portal
1. Visit: https://operations-portal-ten.vercel.app
2. Login: ops@vinayaka.com / (password from admin creation)
3. Click **Create Booking**
4. Fill in:
   - Sender: John Doe
   - Sender Phone: +919999999999
   - Receiver: Jane Smith
   - Receiver Phone: +918888888888
   - Pickup: Nellore (13.6197, 79.9062)
   - Drop: Podalakur (13.6500, 79.8500)
   - Vehicle: Bike
5. Click **Create**
6. **Save the tracking ID** (you'll use this to test tracking)

### 6e. Accept Trip in Rider Portal
1. Visit: https://rider-portal-five.vercel.app
2. Login: driver@vinayaka.com / (password from admin creation)
3. You'll see pending trips
4. Click **Accept Trip**
5. Update status: Started → Pickup Complete → In Transit
6. Upload delivery proof (any image URL)

### 6f. Track Shipment (Public Portal)
1. Visit: https://tracking-portal-nine.vercel.app
2. Enter the tracking ID from Step 6d
3. See:
   - ✅ Booking details (sender, receiver, route)
   - ✅ Driver info
   - ✅ Vehicle details
   - ✅ Timeline (all status updates)
   - ✅ Delivery proof

---

## 🎉 You're Done!

All 5 apps are now fully functional and connected to Supabase!

### Summary of What You Have:

| App | URL | Use |
|-----|-----|-----|
| **Admin Portal** | admin-portal-three-pink.vercel.app | Create users, branches, pricing |
| **Operations Portal** | operations-portal-ten.vercel.app | Create & assign bookings |
| **Rider Portal** | rider-portal-five.vercel.app | Accept & complete trips |
| **Tracking Portal** | tracking-portal-nine.vercel.app | Track shipments (public) |
| **API** | vinayaka-transport-api.vercel.app | All backend logic |

### System Architecture:

```
Users (Web/Mobile)
    ↓
Vercel Front-ends (5 apps)
    ↓
Vercel API (Serverless)
    ↓
Supabase PostgreSQL (Database)
    ↓
Row-Level Security + Audit Logs
```

### Features Available:

✅ Multi-user authentication (4 roles)
✅ Booking lifecycle management
✅ Real-time tracking
✅ Delivery proof capture
✅ Admin dashboard
✅ Role-based access control
✅ Rate limiting
✅ Audit logging

---

## 🐛 If Something Goes Wrong

| Problem | Solution |
|---------|----------|
| "API not responding" | Check Vercel env vars are set for API service |
| "Login page shows blank" | Check NEXT_PUBLIC_API_URL is set for portal |
| "No branches to select" | Create a branch in Admin portal first |
| "Tracking shows nothing" | Create a booking first, use that tracking ID |
| "Deploy fails" | Check vercel.json exists in services/api/ |

---

## 📝 Production Deployment Checklist

- ✅ All 5 apps deployed to Vercel
- ✅ Supabase project created
- ✅ Database schema applied
- ✅ Environment variables configured
- ✅ Auth enabled
- ✅ Test data created
- ✅ End-to-end workflow tested
- ✅ Public tracking working
- ✅ Security policies applied
- ✅ Rate limiting active

---

**Congratulations! Your Vinayaka Transport system is now LIVE! 🚀**

You have a fully functional, production-ready local delivery platform.

Time taken: ~20 minutes
Status: 100% COMPLETE
