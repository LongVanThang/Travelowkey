# 🌍 Travelowkey - Production-Grade Travel Booking Platform

A complete microservices-based travel booking platform built with **Spring Boot**, **Node.js**, **React/Next.js**, and modern DevOps practices.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Load Balancer │
│   (Next.js)     │◄──►│  (Spring Boot)  │◄──►│   (NGINX/AWS)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                   ┌────────────┼────────────┐
                   │            │            │
          ┌─────────▼────┐ ┌─────▼─────┐ ┌───▼──────┐
          │ Auth Service │ │User Service│ │Flight Svc│
          │(Spring Boot) │ │(Spring Boot)│ │(Node.js) │
          └──────────────┘ └────────────┘ └──────────┘
                   │            │            │
       ┌───────────┼────────────┼────────────┼───────────┐
       │           │            │            │           │
   ┌───▼───┐ ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐ ┌──▼───┐
   │Hotel  │ │Car Rental│ │Booking  │ │Payment Svc│ │Review│
   │Service│ │ Service   │ │Service  │ │ (Node.js) │ │ Svc  │
   │(Node) │ │ (Node.js) │ │(Node.js)│ └───────────┘ │(Node)│
   └───────┘ └───────────┘ └─────────┘               └──────┘
       │           │            │                       │
   ┌───▼───┐ ┌─────▼─────┐ ┌────▼────┐             ┌───▼────┐
   │Notify │ │Admin Svc  │ │CMS Svc  │             │Analytics│
   │Service│ │ (Node.js) │ │(Node.js)│             │Service │
   │(Node) │ └───────────┘ └─────────┘             │(Node.js)│
   └───────┘                                       └────────┘
```

## 🛠️ Technology Stack

### Backend Services
- **API Gateway**: Spring Boot + Spring Cloud Gateway + Resilience4j
- **Auth/User Services**: Spring Boot + JPA + PostgreSQL + JWT + OAuth
- **Business Services**: Node.js + Express + PostgreSQL + Redis + Elasticsearch
- **Message Broker**: Apache Kafka
- **Databases**: PostgreSQL, Redis, Elasticsearch, ClickHouse

### Frontend
- **Web App**: Next.js + TypeScript + TailwindCSS + SWR
- **Authentication**: JWT + OAuth (Google, Facebook)
- **State Management**: React Context + SWR

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes + Helm
- **CI/CD**: GitHub Actions / Jenkins
- **Monitoring**: Prometheus + Grafana + Jaeger + ELK Stack
- **Cloud**: AWS / GCP / Azure

## 📋 Current Implementation Status

### ✅ Completed Components

#### 1. **API Gateway Service** (Spring Boot)
- **Location**: `services/api-gateway/`
- **Features**: 
  - JWT Authentication & Authorization
  - Rate Limiting with Redis
  - Circuit Breaker (Resilience4j)
  - CORS Configuration
  - Request Routing to all microservices
  - Health Checks & Metrics
- **Deployment**: Kubernetes manifests, Dockerfile
- **Documentation**: Complete README with setup instructions

#### 2. **Auth Service** (Spring Boot) 
- **Location**: `services/auth-service/`
- **Features**:
  - User Registration & Login
  - JWT Token Management
  - OAuth Integration (Google, Facebook)
  - Multi-Factor Authentication (TOTP)
  - Password Reset & Email Verification
  - Account Security (lockout, rate limiting)
  - GDPR Compliance
  - Kafka Event Publishing
- **Models**: User, Role, UserStatus, OAuthProvider enums
- **DTOs**: LoginRequest, RegisterRequest, JwtResponse, PasswordResetRequest
- **Core Service**: AuthService with complete authentication logic

### 🚧 Implementation Roadmap

## Phase 1: Core Services (Week 1-2)

### **User Service** (Spring Boot)
```bash
# Structure
services/user-service/
├── src/main/java/com/travelowkey/user/
│   ├── controller/UserController.java
│   ├── service/UserService.java
│   ├── model/UserProfile.java
│   ├── dto/UserProfileDto.java
│   └── repository/UserRepository.java
├── Dockerfile
├── k8s/
└── README.md
```

**Key Features**:
- User profile CRUD operations
- Travel preferences management
- Loyalty points system
- Travel history tracking
- GDPR data access/deletion
- Kafka integration for user events

### **Flight Service** (Node.js + Express)
```bash
# Structure
services/flight-service/
├── src/
│   ├── controllers/flightController.js
│   ├── services/flightService.js
│   ├── models/Flight.js
│   ├── routes/flightRoutes.js
│   └── integrations/amadeus.js
├── package.json
├── Dockerfile
├── k8s/
└── README.md
```

**Key Features**:
- Flight search & booking
- Seat selection & management
- Amadeus/Sabre API integration
- Price comparison
- Flight status updates
- Caching with Redis

## Phase 2: Booking Ecosystem (Week 3-4)

### **Hotel Service** (Node.js + Elasticsearch)
```bash
# Key Features
- Hotel listings with Elasticsearch search
- Room availability management
- Booking.com/Expedia integration
- Hotel reviews & ratings
- Geographic search capabilities
- Image management
```

### **Car Rental Service** (Node.js)
```bash
# Key Features
- Car fleet management
- Availability tracking
- Location-based search
- Rental pricing engine
- Insurance options
- Driver verification
```

### **Booking Service** (Node.js + Saga Pattern)
```bash
# Key Features
- Orchestrate multi-service bookings
- Saga pattern for distributed transactions
- Payment coordination
- Booking confirmation & cancellation
- Itinerary management
- Email/SMS notifications
```

## Phase 3: Payment & Reviews (Week 5)

### **Payment Service** (Node.js)
```bash
# Key Features
- Stripe/PayPal integration
- Fraud detection
- Refund processing
- Payment method management
- Recurring payments
- PCI compliance
- Encrypted data storage
```

### **Review Service** (Node.js + Elasticsearch)
```bash
# Key Features
- User reviews & ratings
- Content moderation
- Review aggregation
- Sentiment analysis
- Review search with Elasticsearch
- Spam detection
```

## Phase 4: Support Services (Week 6)

### **Notification Service** (Node.js)
```bash
# Key Features
- Email notifications (SendGrid)
- SMS notifications (Twilio)
- Push notifications (Firebase)
- Template management
- Delivery tracking
- User preferences
```

### **Admin Service** (Node.js)
```bash
# Key Features
- User management dashboard
- System analytics
- Content moderation
- Financial reporting
- System health monitoring
- Role-based access control
```

### **CMS Service** (Node.js)
```bash
# Key Features
- Content management
- Blog posts & articles
- SEO optimization
- Media file management
- Multi-language support
- API for frontend consumption
```

### **Analytics Service** (Node.js + ClickHouse)
```bash
# Key Features
- Real-time analytics
- User behavior tracking
- Revenue analytics
- Performance metrics
- Custom dashboards
- Data export capabilities
```

## Phase 5: Frontend Application (Week 7-8)

### **Next.js Frontend**
```bash
# Structure
frontend/
├── pages/
│   ├── index.tsx (Landing page)
│   ├── auth/ (Login/Register)
│   ├── flights/ (Flight search/booking)
│   ├── hotels/ (Hotel search/booking)
│   ├── cars/ (Car rental)
│   ├── bookings/ (My bookings)
│   └── admin/ (Admin dashboard)
├── components/
├── hooks/
├── utils/
├── styles/
├── Dockerfile
└── k8s/
```

**Key Features**:
- Responsive design with TailwindCSS
- JWT authentication
- Real-time search
- Booking flow
- Payment integration
- Admin dashboard
- SEO optimization

## Phase 6: Security Hardening (Week 9)

**Goal:** Implement enterprise-grade security across all services.

**Tasks:**
- Enable JWT validation in each backend service
- Use mTLS between services (e.g., with Istio)
- Enable CSRF, XSS, and SQLi protection
    - Spring Security (for Java), Helmet.js (for Node.js)
- Role-Based Access Control (RBAC)
- Rate limiting via Redis or Bucket4j

## 🚀 Quick Start Guide

### Prerequisites
```bash
# Required tools
- Docker & Docker Compose
- Kubernetes & Helm
- Java 17+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Kafka 3.0+
```

### 1. Clone and Setup
```bash
git clone <repository>
cd travelowkey
```

### 2. Start Infrastructure
```bash
# Start databases and message broker
docker-compose -f infrastructure/docker-compose.yml up -d

# This includes:
# - PostgreSQL (port 5432)
# - Redis (port 6379)
# - Kafka + Zookeeper (port 9092)
# - Elasticsearch (port 9200)
```

### 3. Run API Gateway
```bash
cd services/api-gateway
mvn spring-boot:run
# Access: http://localhost:8080
```

### 4. Run Auth Service
```bash
cd services/auth-service
mvn spring-boot:run
# Access: http://localhost:3001
```

### 5. Deploy to Kubernetes
```bash
# Create namespace
kubectl create namespace travelowkey

# Deploy services
kubectl apply -f services/api-gateway/k8s/ -n travelowkey
kubectl apply -f services/auth-service/k8s/ -n travelowkey
```

## 📊 Service Templates

### Node.js Service Template
Each Node.js service follows this structure:

```javascript
// package.json template
{
  "name": "@travelowkey/service-name",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "pg": "^8.8.0",
    "redis": "^4.5.0",
    "kafkajs": "^2.2.0",
    "joi": "^17.7.0",
    "winston": "^3.8.0",
    "prometheus-register": "^15.0.0"
  }
}

// Basic Express app structure
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const middleware = require('./middleware');

const app = express();

// Security & middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(middleware.auth);
app.use(middleware.logging);

// Routes
app.use('/api/v1', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

module.exports = app;
```

### Spring Boot Service Template
```java
// Main application class
@SpringBootApplication
@EnableJpa
@EnableKafka
public class ServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ServiceApplication.class, args);
    }
}

// Controller template
@RestController
@RequestMapping("/api/v1/entity")
@Validated
public class EntityController {
    
    @Autowired
    private EntityService entityService;
    
    @GetMapping
    public ResponseEntity<List<EntityDto>> getAll() {
        return ResponseEntity.ok(entityService.findAll());
    }
    
    @PostMapping
    public ResponseEntity<EntityDto> create(@Valid @RequestBody CreateEntityRequest request) {
        return ResponseEntity.status(CREATED).body(entityService.create(request));
    }
}
```

## 🔧 Development Guidelines

### Code Standards
- **Java**: Google Java Style Guide
- **JavaScript/TypeScript**: Prettier + ESLint
- **API Design**: RESTful principles + OpenAPI 3.0
- **Database**: Flyway migrations
- **Testing**: Unit tests (>80% coverage) + Integration tests

### Git Workflow
```bash
# Feature branch workflow
git checkout -b feature/flight-search
git commit -m "feat: implement flight search with Amadeus API"
git push origin feature/flight-search
# Create PR → Review → Merge
```

### Docker Best Practices
- Multi-stage builds for optimization
- Non-root user for security
- Health checks for containers
- Proper secret management

### Kubernetes Deployment
- Resource limits and requests
- Readiness and liveness probes
- ConfigMaps for configuration
- Secrets for sensitive data
- HPA for auto-scaling

## 📈 Monitoring & Observability

### Metrics (Prometheus)
- **Business Metrics**: Bookings, revenue, user activity
- **Technical Metrics**: Response times, error rates, throughput
- **Infrastructure**: CPU, memory, disk usage

### Logging (ELK Stack)
- Structured logging with correlation IDs
- Centralized log aggregation
- Log-based alerting

### Tracing (Jaeger)
- Distributed request tracing
- Performance bottleneck identification
- Service dependency mapping

## 🚀 Deployment Strategy

### Environments
1. **Development**: Local Docker Compose
2. **Staging**: Kubernetes cluster (minimal resources)
3. **Production**: Kubernetes cluster (HA, auto-scaling)

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Service
on:
  push:
    branches: [main]
    paths: ['services/service-name/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build & Test
        run: |
          cd services/service-name
          npm test
          docker build -t travelowkey/service-name:${{ github.sha }} .
      - name: Deploy to K8s
        run: |
          kubectl set image deployment/service-name \
            service-name=travelowkey/service-name:${{ github.sha }}
```

## 📚 Next Steps

1. **Complete User Service** - Implement user profile management
2. **Implement Flight Service** - Add Amadeus integration
3. **Build Hotel Service** - Elasticsearch search implementation
4. **Set up Kafka Topics** - Event-driven architecture
5. **Frontend Development** - Next.js application
6. **DevOps Setup** - Complete CI/CD pipeline
7. **Performance Testing** - Load testing with K6
8. **Security Audit** - Penetration testing
9. **Documentation** - API documentation with Swagger
10. **Production Deployment** - Cloud infrastructure setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow code standards
4. Write tests
5. Submit pull request

## 📄 License

Copyright © 2024 Travelowkey. All rights reserved.

---

**Status**: 🚧 In Development | **Next Milestone**: Complete Core Services
**Architecture**: ✅ Designed | **API Gateway**: ✅ Complete | **Auth Service**: ✅ Complete