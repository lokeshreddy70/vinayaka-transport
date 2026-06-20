# ✅ Complete Application Testing Guide

## Overview

This guide will help you test all features of the Vinayaka Transport application to ensure everything is working correctly.

---

## 📋 Pre-Testing Checklist

- [ ] Docker is running (or local services started)
- [ ] Backend is running on http://localhost:3001
- [ ] Frontend is running on http://localhost:3000
- [ ] PostgreSQL database is connected
- [ ] Redis cache is connected
- [ ] All environment files are configured

---

## 🌍 Frontend Testing

### 1. Landing Page (http://localhost:3000)

**What to look for:**
- ✅ Navigation bar with logo
- ✅ Hero section with "Move Anything. Anywhere. Anytime."
- ✅ CTA button "Get Started Now"
- ✅ 6 Feature cards displaying
- ✅ Service routes section showing Nellore, Podalakur, Tirupati
- ✅ Footer with links
- ✅ Responsive design (test on mobile with F12)

**Test clicks:**
```
1. Click "Get Started Now" → Should navigate to signup
2. Click feature cards → Should highlight on hover
3. Check mobile view → Should be responsive
4. Click footer links → Should work correctly
```

---

### 2. Customer Dashboard (http://localhost:3000/customer)

**What to look for:**
- ✅ Sidebar with navigation menu
  - Dashboard
  - Send Parcel
  - My Orders
  - Wallet
  - Addresses
  - Profile
- ✅ User greeting with name
- ✅ 4 stat cards showing:
  - Active Orders: 0
  - Total Spent: ₹0
  - Wallet Balance: ₹0
  - Loyalty Points: 0
- ✅ "Send Parcel" CTA button
- ✅ Recent Orders section

**Test functionality:**
```
1. Collapse sidebar → Should minimize
2. Click each nav item → Should update content
3. Click "Send Parcel" → Should navigate to booking
4. Check responsive layout → Should work on mobile
```

---

### 3. Booking Wizard (http://localhost:3000/customer/book)

#### Step 1: Locations

**Fields:**
- Pickup Address input
- Drop Address input
- Distance display (calculated)
- Navigation buttons (Next)

**Test:**
```
1. Enter "Nellore" in Pickup
2. Enter "Podalakur" in Drop
3. Should show ~40 km distance
4. Click "Next" → Should go to Step 2
```

#### Step 2: Parcel Details

**Fields:**
- Parcel Category (DOCUMENTS, SMALL_PARCEL, LARGE_PARCEL, etc.)
- Weight (kg)
- Parcel Value (₹)
- Special instructions

**Test:**
```
1. Select "DOCUMENTS"
2. Enter weight: 0.5
3. Enter value: 5000
4. Enter "Handle carefully"
5. Click "Next" → Should go to Step 3
```

#### Step 3: Delivery Options

**Fields:**
- Vehicle Type (BIKE, AUTO, MINI_VAN, etc.)
- Delivery Type (STANDARD, EXPRESS, PRIORITY)
- Fragile checkbox
- Navigation buttons

**Test:**
```
1. Select "BIKE"
2. Select "EXPRESS"
3. Check "Fragile"
4. Click "Next" → Should go to Step 4
```

#### Step 4: Review

**Displays:**
- Order summary
- Route details
- Price breakdown:
  - Base fare: ₹50
  - Distance charge: ₹1.5/km
  - Weight charge: ₹2/kg
  - Express surcharge: 20%
  - Fragile charge: 10%
- Total price: ₹149

**Test:**
```
1. Review all details
2. Prices should be visible
3. Click "Confirm Order" → Should submit (if API connected)
4. See success message or error
```

---

### 4. Rider Dashboard (http://localhost:3000/rider)

**What to look for:**
- ✅ Online/Offline toggle button
- ✅ Rider status (green=online, gray=offline)
- ✅ 4 stat cards:
  - Today's Earnings: ₹0
  - Active Orders: 0
  - Completed: 0
  - Rating: 4.8/5
- ✅ Nearby Orders list (with sample data)
  - Order ID
  - Parcel category
  - Pickup location
  - Drop location
  - Price
  - Distance
  - Accept button
- ✅ Weekly earnings chart

**Test functionality:**
```
1. Click Online button → Status should change to green
2. Click Offline button → Status should change to gray
3. Click "Accept" on orders → Order should move to active
4. Scroll orders → Should be scrollable
5. Check chart → Should display data
```

---

### 5. Admin Dashboard (http://localhost:3000/admin)

**What to look for:**
- ✅ Sidebar menu with 10+ items:
  - Dashboard
  - Orders
  - Riders
  - Customers
  - Pricing
  - Zones
  - Analytics
  - Settlements
  - Settings
  - Help
- ✅ 4 KPI cards:
  - Daily Revenue: ₹12,450
  - Total Orders: 245
  - Active Riders: 34
  - Growth: +15%
- ✅ Charts:
  - Revenue Trend (line graph)
  - Orders by Status (pie/bar chart)
- ✅ Recent Orders table:
  - Order ID
  - Customer
  - Route
  - Status
  - Amount
  - Action buttons

**Test functionality:**
```
1. Click sidebar items → Should update dashboard
2. Click table rows → Should show details
3. Check filters → Should filter data
4. Check pagination → Should load more orders
5. Responsive on mobile → Should collapse sidebar
```

---

## 🔐 Authentication Testing

### Test Account Creation

**API: Send OTP**
```
POST http://localhost:3001/api/auth/send-otp
Body: {
  "phoneNumber": "+919876543210"
}

Expected: 
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully"
}
```

**Check logs** for OTP (usually logged in console for testing)

---

### Test Account Registration

**API: Verify OTP**
```
POST http://localhost:3001/api/auth/verify-otp
Body: {
  "phoneNumber": "+919876543210",
  "otp": "123456",
  "fullName": "Test User",
  "deviceId": "device-abc-123",
  "deviceInfo": "Windows 11"
}

Expected:
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user-xxx",
      "phoneNumber": "+919876543210",
      "fullName": "Test User",
      "role": "CUSTOMER"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Save the accessToken!**

---

### Test Login

**API: Login**
```
POST http://localhost:3001/api/auth/login
Body: {
  "phoneNumber": "+919876543210",
  "otp": "654321",
  "deviceId": "device-def-456",
  "deviceInfo": "Chrome Browser"
}

Expected:
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {...},
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

## 👤 Customer API Testing

### Get Profile
```
GET http://localhost:3001/api/customers/profile
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN

Expected:
{
  "success": true,
  "data": {
    "id": "customer-xxx",
    "totalOrders": 0,
    "totalSpent": 0,
    "averageRating": 0,
    "loyaltyPoints": 0,
    "membershipTier": "STANDARD"
  }
}
```

---

### Add Address
```
POST http://localhost:3001/api/customers/addresses
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN
Body: {
  "type": "HOME",
  "fullAddress": "123 Main Street, Nellore",
  "landmark": "Near Post Office",
  "latitude": 13.6298,
  "longitude": 79.4192,
  "city": "Nellore",
  "state": "Andhra Pradesh",
  "pinCode": "524001",
  "isDefault": true
}

Expected: 201 Created
{
  "success": true,
  "statusCode": 201,
  "message": "Address added successfully",
  "data": {
    "id": "address-xxx",
    "type": "HOME",
    "fullAddress": "123 Main Street, Nellore",
    ...
  }
}
```

---

### Get Addresses
```
GET http://localhost:3001/api/customers/addresses
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN

Expected:
{
  "success": true,
  "data": [
    {
      "id": "address-xxx",
      "type": "HOME",
      "fullAddress": "123 Main Street, Nellore",
      ...
    }
  ]
}
```

---

### Get Orders
```
GET http://localhost:3001/api/customers/orders
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN

Expected:
{
  "success": true,
  "data": []  // Initially empty
}
```

---

### Get Wallet
```
GET http://localhost:3001/api/customers/wallet
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN

Expected:
{
  "success": true,
  "data": {
    "id": "wallet-xxx",
    "balance": 0,
    "totalCredit": 0,
    "totalDebit": 0,
    "transactions": []
  }
}
```

---

## 📦 Order API Testing

### Create Order
```
POST http://localhost:3001/api/orders
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN
Body: {
  "pickupAddressId": "address-xxx",
  "dropAddressId": "address-yyy",
  "pickupLat": 13.6298,
  "pickupLng": 79.4192,
  "dropLat": 13.1939,
  "dropLng": 79.7619,
  "parcelCategory": "DOCUMENTS",
  "parcelWeight": 0.5,
  "parcelValue": 5000,
  "vehicleType": "BIKE",
  "deliveryType": "EXPRESS",
  "isFragile": false
}

Expected: 201 Created
{
  "success": true,
  "statusCode": 201,
  "message": "Order created successfully",
  "data": {
    "id": "order-xxx",
    "orderNumber": "ORD-12345",
    "status": "PENDING",
    "totalPrice": 149.00,
    "estimatedDeliveryTime": "..."
  }
}
```

**Save the order ID!**

---

### Get Order Details
```
GET http://localhost:3001/api/orders/order-xxx
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN

Expected:
{
  "success": true,
  "data": {
    "id": "order-xxx",
    "orderNumber": "ORD-12345",
    "status": "PENDING",
    "totalPrice": 149.00,
    "rider": null,  // Not assigned yet
    "delivery": {...}
  }
}
```

---

### Track Order
```
GET http://localhost:3001/api/orders/order-xxx/track
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN

Expected:
{
  "success": true,
  "data": []  // Initially empty, populated when rider picks up
}
```

---

### Cancel Order
```
POST http://localhost:3001/api/orders/order-xxx/cancel
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN
Body: {
  "reason": "Changed my mind"
}

Expected:
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "id": "order-xxx",
    "status": "CANCELLED"
  }
}
```

---

## 🏃 Rider API Testing

### Register as Rider
```
POST http://localhost:3001/api/riders/register
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN
Body: {
  "aadhaarNumber": "1234567890123",
  "aadhaarPhoto": "https://...",
  "licenseNumber": "DL0620230001234",
  "licensePhoto": "https://...",
  "rcNumber": "TS0720161234567",
  "rcPhoto": "https://...",
  "selfiePhoto": "https://..."
}

Expected: 201 Created
{
  "success": true,
  "statusCode": 201,
  "message": "Rider profile created",
  "data": {
    "id": "rider-xxx",
    "verificationStatus": "PENDING",
    "isApproved": false
  }
}
```

---

### Get Rider Profile
```
GET http://localhost:3001/api/riders/profile
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN

Expected:
{
  "success": true,
  "data": {
    "id": "rider-xxx",
    "verificationStatus": "PENDING",
    "isApproved": false,
    "totalDeliveries": 0,
    "averageRating": 0,
    "isOnline": false
  }
}
```

---

### Update Location
```
POST http://localhost:3001/api/riders/location
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN
Body: {
  "latitude": 13.6298,
  "longitude": 79.4192
}

Expected:
{
  "success": true,
  "message": "Location updated"
}
```

---

### Go Online
```
POST http://localhost:3001/api/riders/online
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN

Expected:
{
  "success": true,
  "message": "Rider is online",
  "data": {
    "id": "rider-xxx",
    "isOnline": true
  }
}
```

---

### Go Offline
```
POST http://localhost:3001/api/riders/offline
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN

Expected:
{
  "success": true,
  "message": "Rider is offline",
  "data": {
    "id": "rider-xxx",
    "isOnline": false
  }
}
```

---

## 📊 Database Testing

### Connect to Database
```powershell
docker-compose exec postgres psql -U vinayaka -d vinayaka_transport
```

### Check Tables
```sql
\dt              -- List all tables

-- Check users
SELECT * FROM "User" LIMIT 5;

-- Check orders
SELECT * FROM "Order" LIMIT 5;

-- Check customers
SELECT * FROM "Customer" LIMIT 5;

-- Check riders
SELECT * FROM "Rider" LIMIT 5;

-- Count records
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Order";

-- Exit
\q
```

---

## 🔍 Health Checks

### Backend Health
```powershell
curl http://localhost:3001/health

Expected:
{"status":"ok","timestamp":"2024-01-15T10:30:00Z"}
```

### Frontend Health
```powershell
curl http://localhost:3000

Expected: HTML content (landing page)
```

### Database Health
```powershell
docker-compose exec postgres psql -U vinayaka -d vinayaka_transport -c "SELECT 1;"

Expected: 
 ?column? 
----------
        1
```

### Redis Health
```powershell
docker-compose exec redis redis-cli ping

Expected: PONG
```

---

## 📋 Testing Checklist

### Frontend
- [ ] Landing page loads and displays all sections
- [ ] Customer dashboard accessible and shows stats
- [ ] 4-step booking wizard works
- [ ] Rider dashboard shows online/offline toggle
- [ ] Admin dashboard loads with KPI cards
- [ ] All pages are responsive
- [ ] Navigation works between pages
- [ ] Forms validate inputs
- [ ] Buttons respond to clicks

### Backend API
- [ ] Send OTP endpoint works
- [ ] Verify OTP endpoint works
- [ ] Create account works
- [ ] Login works
- [ ] Get profile works
- [ ] Add address works
- [ ] Create order works
- [ ] Track order works
- [ ] Cancel order works
- [ ] Register rider works
- [ ] Update location works
- [ ] Go online/offline works

### Database
- [ ] PostgreSQL is running and connected
- [ ] All 60+ tables exist
- [ ] Can insert users
- [ ] Can insert orders
- [ ] Can query data
- [ ] Indexes are working

### Infrastructure
- [ ] Backend logs show no errors
- [ ] Frontend logs show no errors
- [ ] Database logs show no errors
- [ ] Redis is connected
- [ ] All containers are healthy

---

## ✅ Success Criteria

Your Vinayaka Transport application is fully functional when:

✅ **All Frontend Pages Load**
- Landing page
- Customer dashboard
- Booking wizard
- Rider dashboard
- Admin dashboard

✅ **Authentication Works**
- Can send OTP
- Can verify OTP
- Can create account
- Can login
- Tokens work

✅ **APIs Respond Correctly**
- All 30+ endpoints work
- Responses have correct format
- Status codes are correct
- Errors are handled properly

✅ **Database Works**
- All tables exist
- Can insert data
- Can query data
- Relationships work

✅ **UI is Responsive**
- Desktop layout works
- Tablet layout works
- Mobile layout works
- All interactions work

---

**Congratulations! Your application is ready for production! 🎉**

If all tests pass, you have a fully functional, production-ready Vinayaka Transport application.
