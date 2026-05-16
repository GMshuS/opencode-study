# E-Commerce Microservices Architecture

A comprehensive microservices-based e-commerce platform built with Node.js, TypeScript, PostgreSQL, MongoDB, Kafka, and Redis.

## Architecture Overview

![Architecture Diagram](./architecture.drawio.png)

### System Components

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| API Gateway | 8000 | None | Request routing, authentication, rate limiting |
| Auth Service | 8001 | PostgreSQL | User registration, login, JWT token management |
| User Service | 8002 | PostgreSQL | User profiles, addresses, preferences |
| Product Service | 8003 | MongoDB | Product catalog, inventory management |
| Order Service | 8004 | PostgreSQL | Order creation, status tracking |
| Payment Service | 8005 | PostgreSQL | Payment processing (Stripe, PayPal) |
| Notification Service | 8006 | None | Email, SMS, push notifications via Kafka |

### Infrastructure

| Component | Port | Description |
|-----------|------|-------------|
| PostgreSQL (Auth) | 5432 | Auth service database |
| PostgreSQL (User) | 5433 | User service database |
| PostgreSQL (Order) | 5434 | Order service database |
| PostgreSQL (Payment) | 5435 | Payment service database |
| MongoDB | 27017 | Product service database |
| Redis | 6379 | Caching layer |
| Kafka | 9092 | Message broker |
| Kafka UI | 8080 | Kafka monitoring dashboard |

## Project Structure

```
microservices-ecommerce/
├── packages/
│   └── shared/              # Shared types, utilities, and error classes
├── services/
│   ├── api-gateway/         # API Gateway service
│   ├── auth-service/        # Authentication service
│   ├── user-service/        # User management service
│   ├── product-service/     # Product catalog service
│   ├── order-service/       # Order management service
│   ├── payment-service/     # Payment processing service
│   └── notification-service/# Notification service
├── docker-compose.yml       # Docker orchestration
├── package.json             # Root package with workspaces
└── architecture.drawio      # Architecture diagram source
```

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or yarn

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f api-gateway
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Build shared package
npm run build --workspace=packages/shared

# Start all services in development mode
npm run dev

# Or start individual services
npm run dev:gateway
npm run dev:auth
npm run dev:user
npm run dev:product
npm run dev:order
npm run dev:payment
npm run dev:notification
```

## API Endpoints

### Authentication (`/api/auth`)

```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login user
POST   /api/auth/refresh           # Refresh access token
POST   /api/auth/logout            # Logout user
GET    /api/auth/verify            # Verify token validity
```

### Users (`/api/users`)

```
GET    /api/users/profile/:userId       # Get user profile
PUT    /api/users/profile/:userId       # Update user profile
GET    /api/users/addresses/:userId     # Get user address
```

### Products (`/api/products`)

```
GET    /api/products                    # List products (with pagination)
GET    /api/products/:id                # Get product by ID
POST   /api/products                    # Create product (Admin)
PUT    /api/products/:id                # Update product (Admin)
DELETE /api/products/:id                # Delete product (Admin)
PATCH  /api/products/:id/stock          # Update stock
```

### Orders (`/api/orders`)

```
POST   /api/orders                      # Create order
GET    /api/orders                      # List orders (with filters)
GET    /api/orders/:id                  # Get order by ID
PATCH  /api/orders/:id/status           # Update order status
POST   /api/orders/:id/cancel           # Cancel order
```

### Payments (`/api/payments`)

```
POST   /api/payments/process            # Process payment
GET    /api/payments                    # List payments
GET    /api/payments/:id                # Get payment by ID
POST   /api/payments/:id/refund         # Refund payment
```

### Notifications (`/api/notifications`)

```
POST   /api/notifications/send/email    # Send email
POST   /api/notifications/send/sms      # Send SMS
POST   /api/notifications/send/push     # Send push notification
```

## Kafka Topics

| Topic | Producer | Consumer | Description |
|-------|----------|----------|-------------|
| `order.created` | Order Service | Notification, Payment | New order events |
| `order.updated` | Order Service | Notification | Order status changes |
| `payment.completed` | Payment Service | Order, Notification | Successful payments |
| `payment.failed` | Payment Service | Order, Notification | Failed payments |
| `user.registered` | Auth Service | Notification | New user registrations |
| `product.stock.updated` | Product Service | Order | Stock level changes |
| `notification.email` | Any Service | Notification Service | Email notifications |
| `notification.sms` | Any Service | Notification Service | SMS notifications |
| `notification.push` | Any Service | Notification Service | Push notifications |

## Environment Variables

Create a `.env` file in the root directory:

```env
JWT_SECRET=your-super-secret-jwt-key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@ecommerce.com
```

## Database Schema

### Auth Database (PostgreSQL)

```sql
users (
  id, email, username, password_hash, role, created_at, updated_at
)
refresh_tokens (
  id, user_id, token, expires_at, created_at
)
```

### User Database (PostgreSQL)

```sql
user_profiles (
  id, user_id, first_name, last_name, phone, avatar_url,
  address_street, address_city, address_state, address_zip_code, address_country,
  created_at, updated_at
)
```

### Order Database (PostgreSQL)

```sql
orders (
  id, user_id, items (JSONB), total_amount, status, payment_id,
  shipping_address (JSONB), created_at, updated_at
)
```

### Payment Database (PostgreSQL)

```sql
payments (
  id, order_id, user_id, amount, method, status, transaction_id,
  created_at, updated_at
)
```

### Product Database (MongoDB)

```javascript
products {
  id, name, description, price, stock, category, images[], 
  createdAt, updatedAt
}
```

## Scaling

Each service can be scaled independently:

```bash
# Scale order service to 3 instances
docker-compose up -d --scale order-service=3

# Scale product service to 2 instances
docker-compose up -d --scale product-service=2
```

## Monitoring

- **Kafka UI**: http://localhost:8080
- **Health Checks**: `GET /health` on each service

## Technology Stack

- **Runtime**: Node.js 20, TypeScript
- **Framework**: Express.js
- **Databases**: PostgreSQL 15, MongoDB 7, Redis 7
- **Message Broker**: Apache Kafka 7.5
- **Authentication**: JWT, bcrypt
- **Payment**: Stripe, PayPal
- **Notifications**: Nodemailer (Email), Twilio (SMS), Firebase (Push)
- **Containerization**: Docker, Docker Compose

## License

MIT
