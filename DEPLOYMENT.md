# 🚀 Vinayaka Transport - Deployment Guide

## Production Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database backups configured
- [ ] SSL certificates obtained
- [ ] Security audit completed
- [ ] Load testing passed
- [ ] Monitoring setup

### Infrastructure Setup

#### 1. AWS Setup (Recommended)

**RDS Database**
```bash
# Create PostgreSQL RDS instance
aws rds create-db-instance \
  --db-instance-identifier vinayaka-prod \
  --db-instance-class db.t4g.medium \
  --engine postgres \
  --master-username admin \
  --allocated-storage 100 \
  --backup-retention-period 30
```

**ElastiCache (Redis)**
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id vinayaka-redis \
  --cache-node-type cache.t4g.micro \
  --engine redis
```

**S3 Bucket**
```bash
aws s3 mb s3://vinayaka-transport-prod
aws s3api put-bucket-versioning \
  --bucket vinayaka-transport-prod \
  --versioning-configuration Status=Enabled
```

**ECR Repositories**
```bash
aws ecr create-repository --repository-name vinayaka-backend
aws ecr create-repository --repository-name vinayaka-frontend
```

#### 2. Application Deployment

**Build Docker Images**
```bash
# Backend
docker build -f backend/Dockerfile -t vinayaka-backend:latest backend/
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <YOUR_ECR_URI>
docker tag vinayaka-backend:latest <ECR_URI>/vinayaka-backend:latest
docker push <ECR_URI>/vinayaka-backend:latest

# Frontend
docker build -f frontend/Dockerfile -t vinayaka-frontend:latest frontend/
docker tag vinayaka-frontend:latest <ECR_URI>/vinayaka-frontend:latest
docker push <ECR_URI>/vinayaka-frontend:latest
```

**Deploy on ECS**
```bash
# Register task definitions
aws ecs register-task-definition --cli-input-json file://task-definition-backend.json
aws ecs register-task-definition --cli-input-json file://task-definition-frontend.json

# Create services
aws ecs create-service --cluster vinayaka-prod --service-name backend --task-definition vinayaka-backend --desired-count 3
aws ecs create-service --cluster vinayaka-prod --service-name frontend --task-definition vinayaka-frontend --desired-count 3
```

#### 3. Database Migration

```bash
# Run Prisma migrations on production database
DATABASE_URL="postgresql://user:pass@prod-db:5432/vinayaka" npx prisma migrate deploy

# Seed initial data (if needed)
DATABASE_URL="postgresql://user:pass@prod-db:5432/vinayaka" npx prisma db seed
```

#### 4. SSL/TLS Configuration

```bash
# Use AWS Certificate Manager (ACM)
aws acm request-certificate \
  --domain-name vinayakatransport.com \
  --domain-name "*.vinayakatransport.com" \
  --validation-method DNS

# Link to Application Load Balancer
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<CERT_ARN> \
  --default-actions Type=forward,TargetGroupArn=<TARGET_GROUP_ARN>
```

### Monitoring & Alerts

**CloudWatch Monitoring**
```json
{
  "AlarmActions": ["arn:aws:sns:region:account:alerts"],
  "MetricName": "CPUUtilization",
  "Namespace": "AWS/ECS",
  "Statistic": "Average",
  "Period": 300,
  "EvaluationPeriods": 2,
  "Threshold": 70,
  "ComparisonOperator": "GreaterThanThreshold"
}
```

**Application Insights**
- DataDog for monitoring
- Sentry for error tracking
- New Relic for APM

### Backup & Recovery

```bash
# Automated RDS backups
aws rds modify-db-instance \
  --db-instance-identifier vinayaka-prod \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00"

# Manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier vinayaka-prod \
  --db-snapshot-identifier vinayaka-snapshot-$(date +%Y%m%d)
```

### Load Balancing & Auto-Scaling

**Application Load Balancer**
```bash
aws elbv2 create-load-balancer \
  --name vinayaka-alb \
  --subnets subnet-12345678 subnet-87654321 \
  --security-groups sg-12345678
```

**Auto Scaling**
```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name vinayaka-backend-asg \
  --launch-template LaunchTemplateName=vinayaka-backend \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3
```

### CDN Configuration

```bash
# CloudFront distribution for static assets
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy Vinayaka Transport

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install backend dependencies
        run: cd backend && npm ci
      
      - name: Run backend tests
        run: cd backend && npm test
      
      - name: Install frontend dependencies
        run: cd frontend && npm ci
      
      - name: Run frontend tests
        run: cd frontend && npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      
      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push backend
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f backend/Dockerfile -t $ECR_REGISTRY/vinayaka-backend:$IMAGE_TAG .
          docker push $ECR_REGISTRY/vinayaka-backend:$IMAGE_TAG
      
      - name: Build and push frontend
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f frontend/Dockerfile -t $ECR_REGISTRY/vinayaka-frontend:$IMAGE_TAG .
          docker push $ECR_REGISTRY/vinayaka-frontend:$IMAGE_TAG

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster vinayaka-prod \
            --service backend \
            --force-new-deployment \
            --region ap-south-1
          
          aws ecs update-service \
            --cluster vinayaka-prod \
            --service frontend \
            --force-new-deployment \
            --region ap-south-1
```

---

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check database URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**High Memory Usage**
```bash
# Check container memory
docker stats

# Scale down or increase instance size
docker-compose up -d --scale backend=2
```

**SSL Certificate Expired**
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Restart nginx
docker-compose restart nginx
```

---

## 📈 Performance Tuning

**PostgreSQL**
```sql
-- Optimize for production
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

**Redis**
```
maxmemory 256mb
maxmemory-policy allkeys-lru
```

---

## 🔐 Security Hardening

1. **Enable VPC**
   - Private subnets for database
   - Security groups with minimal permissions

2. **API Security**
   - WAF rules on CloudFront
   - DDoS protection
   - Rate limiting

3. **Secrets Management**
   - Use AWS Secrets Manager
   - Rotate keys monthly
   - Audit access logs

---

**Last Updated:** 2024
