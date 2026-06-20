# 📚 Vinayaka Transport - API Documentation

## Base URL

```
Production: https://api.vinayakatransport.com/api
Development: http://localhost:3001/api
```

## Authentication

All endpoints (except auth) require an `Authorization` header:

```
Authorization: Bearer <ACCESS_TOKEN>
```

Tokens expire after 1 hour. Use refresh token to get a new one.

---

## 🔐 Authentication Endpoints

### 1. Send OTP

Send OTP to a phone number for login/registration.

```http
POST /auth/send-otp
```

**Request:**
```json
{
  "phoneNumber": "+919876543210"
}
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

---

### 2. Verify OTP & Register

Register a new user or login with OTP.

```http
POST /auth/verify-otp
```

**Request:**
```json
{
  "phoneNumber": "+919876543210",
  "otp": "123456",
  "fullName": "Rajesh Kumar",
  "deviceId": "device-abc-123",
  "deviceInfo": "iPhone 12 Pro"
}
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

---

### 3. Login

Login with OTP verification.

```http
POST /auth/login
```

**Request:**
```json
{
  "phoneNumber": "+919876543210",
  "otp": "123456",
  "deviceId": "device-abc-123",
  "deviceInfo": "Samsung Galaxy S21"
}
```

**Response:**
```json
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

### 4. Refresh Token

Get a new access token using refresh token.

```http
POST /auth/refresh-token
```

**Headers:**
```
Authorization: Bearer <REFRESH_TOKEN>
```

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### 5. Logout

Logout and invalidate tokens.

```http
POST /auth/logout
```

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logout successful"
}
```

---

## 👥 Customer Endpoints

### 1. Get Customer Profile

```http
GET /customers/profile
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "customer-123",
    "userId": "user-123",
    "totalOrders": 25,
    "totalSpent": 3750.50,
    "averageRating": 4.8,
    "loyaltyPoints": 125,
    "membershipTier": "PREMIUM"
  }
}
```

---

### 2. Update Customer Profile

```http
PUT /customers/profile
```

**Request:**
```json
{
  "fullName": "Rajesh Kumar Singh",
  "email": "rajesh@example.com",
  "profilePhoto": "https://..."
}
```

---

### 3. Add Address

```http
POST /customers/addresses
```

**Request:**
```json
{
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
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Address added successfully",
  "data": {
    "id": "address-123",
    "type": "HOME",
    "fullAddress": "123 Main Street, Nellore",
    ...
  }
}
```

---

### 4. Get Saved Addresses

```http
GET /customers/addresses
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "address-123",
      "type": "HOME",
      "fullAddress": "123 Main Street, Nellore",
      ...
    },
    {
      "id": "address-124",
      "type": "OFFICE",
      "fullAddress": "456 Office Blvd, Podalakur",
      ...
    }
  ]
}
```

---

### 5. Get Customer Orders

```http
GET /customers/orders
```

**Query Parameters:**
- `status` (optional): PENDING, CONFIRMED, ASSIGNED, PICKED_UP, ON_WAY, DELIVERED, CANCELLED
- `limit` (optional): Number of orders to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order-123",
      "orderNumber": "ORD-12345",
      "status": "DELIVERED",
      "totalPrice": 149.00,
      "createdAt": "2024-01-15T10:30:00Z",
      ...
    }
  ]
}
```

---

### 6. Get Wallet

```http
GET /customers/wallet
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "wallet-123",
    "balance": 500.50,
    "totalCredit": 1000.00,
    "totalDebit": 499.50,
    "transactions": [
      {
        "id": "txn-123",
        "type": "CREDIT",
        "amount": 100.00,
        "description": "Referral bonus",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

## 📦 Order Endpoints

### 1. Create Order

Create a new delivery order.

```http
POST /orders
```

**Request:**
```json
{
  "pickupAddressId": "address-123",
  "dropAddressId": "address-124",
  "pickupLat": 13.6298,
  "pickupLng": 79.4192,
  "dropLat": 13.1939,
  "dropLng": 79.7619,
  "parcelCategory": "DOCUMENTS",
  "parcelWeight": 0.5,
  "parcelValue": 5000,
  "vehicleType": "BIKE",
  "deliveryType": "EXPRESS",
  "isFragile": false,
  "specialInstructions": "Handle with care"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Order created successfully",
  "data": {
    "id": "order-123",
    "orderNumber": "ORD-12345",
    "status": "PENDING",
    "estimatedDistance": 45.5,
    "totalPrice": 149.00,
    "estimatedDeliveryTime": "2024-01-15T11:45:00Z",
    ...
  }
}
```

---

### 2. Get Order Details

```http
GET /orders/:orderId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "orderNumber": "ORD-12345",
    "status": "ON_WAY",
    "customerId": "customer-123",
    "riderId": "rider-456",
    "estimatedDistance": 45.5,
    "totalPrice": 149.00,
    "rider": {
      "id": "rider-456",
      "user": {
        "phoneNumber": "+919876543211",
        "fullName": "Arjun Singh"
      },
      "vehicle": {
        "vehicleType": "BIKE",
        "vehicleNumber": "TS07AB1234"
      }
    },
    "delivery": {
      "status": "IN_PROGRESS"
    },
    "trackingLogs": [...]
  }
}
```

---

### 3. Track Order

Get real-time tracking data for an order.

```http
GET /orders/:orderId/track
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-1",
      "latitude": 13.6298,
      "longitude": 79.4192,
      "status": "PICKED_UP",
      "timestamp": "2024-01-15T10:45:00Z",
      "accuracy": 5
    },
    {
      "id": "log-2",
      "latitude": 13.5500,
      "longitude": 79.4500,
      "status": "ON_WAY",
      "timestamp": "2024-01-15T11:00:00Z",
      "accuracy": 8
    }
  ]
}
```

---

### 4. Cancel Order

```http
POST /orders/:orderId/cancel
```

**Request:**
```json
{
  "reason": "Changed my mind"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "id": "order-123",
    "status": "CANCELLED",
    "cancelledAt": "2024-01-15T11:15:00Z"
  }
}
```

---

## 🏃 Rider Endpoints

### 1. Register as Rider

```http
POST /riders/register
```

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Request:**
```json
{
  "aadhaarNumber": "1234567890123",
  "aadhaarPhoto": "https://...",
  "licenseNumber": "DL0620230001234",
  "licensePhoto": "https://...",
  "rcNumber": "TS0720161234567",
  "rcPhoto": "https://...",
  "selfiePhoto": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Rider profile created",
  "data": {
    "id": "rider-456",
    "verificationStatus": "PENDING",
    "isApproved": false
  }
}
```

---

### 2. Get Rider Profile

```http
GET /riders/profile
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "rider-456",
    "userId": "user-123",
    "aadhaarNumber": "1234567890123",
    "licenseNumber": "DL0620230001234",
    "verificationStatus": "APPROVED",
    "isApproved": true,
    "totalDeliveries": 245,
    "completedDeliveries": 242,
    "averageRating": 4.9,
    "totalEarnings": 28500.00,
    "isOnline": true,
    "currentLocation": "Nellore",
    "wallet": {
      "balance": 2500.00
    },
    "vehicle": {
      "vehicleType": "BIKE",
      "vehicleNumber": "TS07AB1234",
      "vehicleModel": "Honda CB 200",
      "isVerified": true
    }
  }
}
```

---

### 3. Update Location

Send real-time GPS location.

```http
POST /riders/location
```

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Request:**
```json
{
  "latitude": 13.6298,
  "longitude": 79.4192
}
```

---

### 4. Go Online

```http
POST /riders/online
```

**Response:**
```json
{
  "success": true,
  "message": "Rider is online",
  "data": {
    "id": "rider-456",
    "isOnline": true
  }
}
```

---

### 5. Go Offline

```http
POST /riders/offline
```

**Response:**
```json
{
  "success": true,
  "message": "Rider is offline",
  "data": {
    "id": "rider-456",
    "isOnline": false
  }
}
```

---

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid request",
  "error": "Phone number is required"
}
```

### Common Error Codes

| Code | Message | Cause |
|------|---------|-------|
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

---

## 🔄 Pagination

List endpoints support pagination:

```
GET /orders?limit=10&offset=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 10,
    "offset": 20,
    "total": 245,
    "hasMore": true
  }
}
```

---

## 📚 Rate Limiting

- **General API**: 30 requests/second per IP
- **OTP Endpoint**: 3 requests/minute per phone number
- **Auth Endpoints**: 5 requests/15 minutes per IP

Rate limit info in response headers:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
X-RateLimit-Reset: 1705317600
```

---

## 🧪 Testing with cURL

```bash
# Send OTP
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'

# Get customer profile
curl -X GET http://localhost:3001/api/customers/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create order
curl -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @order.json
```

---

**Last Updated:** December 2024 | v1.0.0
