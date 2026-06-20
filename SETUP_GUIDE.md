# 🚀 Vinayaka Transport - Complete Setup Guide

## Project Overview

**Vinayaka Transport** is a production-ready logistics and hyperlocal delivery platform built for India. It connects customers, riders, and business partners on a scalable architecture.

### Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL
- Prisma ORM
- Redis for caching
- JWT Authentication
- Socket.io for real-time tracking

**Frontend:**
- React + Next.js
- TypeScript
- Tailwind CSS
- Shadcn UI Components

**Deployment:**
- Docker & Docker Compose
- Nginx Reverse Proxy
- AWS/GCP ready

---

## 📁 Project Structure

```
vinayaka-transport/
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── controllers/       # Request handlers
│   │   ├── services/          # Business logic
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Custom middleware
│   │   ├── models/            # Prisma models
│   │   └── server.ts          # Express server
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # Next.js Website
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── customer/          # Customer dashboard
│   │   ├── rider/             # Rider dashboard
│   │   ├── admin/             # Admin panel
│   │   └── layout.tsx
│   ├── components/
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   └── next.config.js
│
├── docker-compose.yml          # Docker orchestration
├── nginx.conf                  # Reverse proxy config
└── README.md
```

---

## 🔧 Installation & Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- PostgreSQL 15+ (for local development)
- Redis 7+ (for local development)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/yourusername/vinayaka-transport.git
cd vinayaka-transport

# Copy environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit environment files with your credentials
# - Database credentials
# - API keys (Twilio, Google Maps, AWS)
# - JWT secrets

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:3001
# Admin: http://localhost/admin
```

### Local Development Setup

#### Backend

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
# Server runs on http://localhost:3001
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Website runs on http://localhost:3000
```

---

## 🗄️ Database Schema

The application uses PostgreSQL with 40+ tables managed by Prisma ORM:

**Core Tables:**
- `User` - User authentication and profile
- `Customer` - Customer profile and preferences
- `Rider` - Rider profile and verification
- `Order` - Delivery orders
- `Delivery` - Delivery tracking
- `Payment` - Payment records
- `Wallet` - Customer & Rider wallets

**Supporting Tables:**
- `Address` - Saved addresses
- `Vehicle` - Rider vehicles
- `TrackingLog` - Real-time tracking
- `PricingRule` - Dynamic pricing
- `DeliveryZone` - Service zones
- `Franchise` - Franchise management
- And more...

---

## 🔐 Authentication

### OTP-Based Authentication

1. **Send OTP**
   ```bash
   POST /api/auth/send-otp
   {
     "phoneNumber": "+91XXXXXXXXXX"
   }
   ```

2. **Verify OTP & Register**
   ```bash
   POST /api/auth/verify-otp
   {
     "phoneNumber": "+91XXXXXXXXXX",
     "otp": "123456",
     "fullName": "John Doe",
     "deviceId": "unique-device-id"
   }
   ```

3. **Response**
   ```json
   {
     "user": {...},
     "accessToken": "eyJhbGc...",
     "refreshToken": "eyJhbGc..."
   }
   ```

### Token Management

- **Access Token**: Valid for 1 hour
- **Refresh Token**: Valid for 7 days
- **Device Sessions**: Track multiple devices per user

---

## 📱 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP & register
- `POST /api/auth/login` - Login with OTP
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh-token` - Refresh access token

### Customers
- `GET /api/customers/profile` - Get customer profile
- `PUT /api/customers/profile` - Update profile
- `POST /api/customers/addresses` - Add address
- `GET /api/customers/addresses` - Get all addresses
- `GET /api/customers/orders` - Get customer orders
- `GET /api/customers/wallet` - Get wallet info

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:orderId` - Get order details
- `GET /api/orders/:orderId/track` - Track order
- `POST /api/orders/:orderId/cancel` - Cancel order

### Riders
- `POST /api/riders/register` - Register as rider
- `GET /api/riders/profile` - Get rider profile
- `POST /api/riders/location` - Update location
- `POST /api/riders/online` - Go online
- `POST /api/riders/offline` - Go offline

---

## 🌍 Deployment

### AWS Deployment

1. **Setup EC2 Instance**
   ```bash
   # Launch Ubuntu 22.04 LTS instance
   # Security group: Allow 80, 443, 22
   ```

2. **Install Docker**
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose
   sudo usermod -aG docker $USER
   ```

3. **Deploy Application**
   ```bash
   git clone https://github.com/yourusername/vinayaka-transport.git
   cd vinayaka-transport
   
   # Setup SSL with Let's Encrypt
   sudo certbot certonly --standalone -d yourdomain.com
   
   # Start services
   docker-compose up -d
   ```

### Kubernetes Deployment

```yaml
# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

# Deploy PostgreSQL
kubectl apply -f k8s/postgres-statefulset.yaml

# Deploy Nginx Ingress
kubectl apply -f k8s/nginx-ingress.yaml
```

---

## 🔒 Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use secrets management (AWS Secrets Manager)
   - Rotate keys regularly

2. **Database**
   - Enable SSL connections
   - Use strong passwords
   - Regular backups

3. **API Security**
   - Rate limiting enabled
   - CORS configured
   - SQL injection prevention
   - XSS protection

4. **SSL/TLS**
   - HTTPS enforced
   - Strong cipher suites
   - Certificate auto-renewal

---

## 📊 Monitoring & Logging

### Health Checks

```bash
# Backend
curl http://localhost:3001/health

# Frontend
curl http://localhost:3000/health
```

### Logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Database logs
docker-compose logs -f postgres
```

### Metrics

Track with:
- Prometheus for metrics
- Grafana for dashboards
- ELK stack for logging

---

## 🚀 Performance Optimization

1. **Database**
   - Connection pooling (PgBouncer)
   - Query optimization
   - Index creation

2. **Caching**
   - Redis for session storage
   - API response caching
   - Real-time data updates via Socket.io

3. **Frontend**
   - Code splitting
   - Image optimization
   - CDN for static assets

4. **Backend**
   - Async/await for I/O operations
   - Worker queues for heavy tasks
   - Request batching

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# E2E testing
npm run test:e2e
```

---

## 📞 Support & Contact

- GitHub Issues: https://github.com/yourusername/vinayaka-transport/issues
- Email: support@vinayakatransport.com
- Documentation: https://docs.vinayakatransport.com

---

## 📝 License

MIT License - See LICENSE file for details

---

**Last Updated:** 2024 | Version 1.0.0
