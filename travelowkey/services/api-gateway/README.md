# Travelowkey API Gateway

## Overview

The Travelowkey API Gateway serves as the single entry point for all client requests in the microservices architecture. It provides:

- **Request Routing**: Routes requests to appropriate microservices
- **Authentication**: JWT token validation and user context injection
- **Authorization**: Role-based access control for admin endpoints
- **Rate Limiting**: Redis-based request rate limiting
- **Circuit Breaking**: Resilience4j circuit breakers for fault tolerance
- **CORS Handling**: Cross-origin resource sharing configuration
- **Security Headers**: HTTPS, HSTS, and security header management
- **Monitoring**: Prometheus metrics and health checks

## Features

### 🔐 Security
- JWT authentication with token blacklist checking
- Admin-only endpoint authorization
- CORS configuration for frontend applications
- Security headers (HSTS, X-Frame-Options, etc.)

### 🚦 Traffic Management
- Rate limiting with Redis backend
- Circuit breakers for downstream services
- Load balancing across service instances

### 📊 Observability
- Prometheus metrics endpoint
- Health checks for Kubernetes
- Distributed tracing support
- Structured logging

## Quick Start

### Prerequisites
- Java 17+
- Maven 3.9+
- Redis (for rate limiting and token blacklist)
- Docker (optional)

### Running Locally

1. **Start Redis**:
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

2. **Configure Environment**:
```bash
export JWT_SECRET="your-secret-key"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
```

3. **Run the Application**:
```bash
mvn spring-boot:run
```

The gateway will start on `http://localhost:8080`

### Using Docker

1. **Build the Image**:
```bash
docker build -t travelowkey/api-gateway:latest .
```

2. **Run with Docker**:
```bash
docker run -d \
  --name api-gateway \
  -p 8080:8080 \
  -e REDIS_HOST=redis \
  -e JWT_SECRET=your-secret-key \
  --link redis:redis \
  travelowkey/api-gateway:latest
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_PORT` | Server port | `8080` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | (optional) |
| `FACEBOOK_CLIENT_ID` | Facebook OAuth client ID | (optional) |
| `FACEBOOK_CLIENT_SECRET` | Facebook OAuth secret | (optional) |

### Route Configuration

The gateway routes requests to the following microservices:

- `/api/v1/auth/**` → Auth Service (Spring Boot)
- `/api/v1/users/**` → User Service (Spring Boot)
- `/api/v1/flights/**` → Flight Service (Node.js)
- `/api/v1/hotels/**` → Hotel Service (Node.js)
- `/api/v1/cars/**` → Car Service (Node.js)
- `/api/v1/bookings/**` → Booking Service (Node.js)
- `/api/v1/payments/**` → Payment Service (Node.js)
- `/api/v1/reviews/**` → Review Service (Node.js)
- `/api/v1/admin/**` → Admin Service (Node.js)

## Testing

### Run Unit Tests
```bash
mvn test
```

### Run Integration Tests
```bash
mvn verify
```

### Test Health Endpoint
```bash
curl http://localhost:8080/actuator/health
```

### Test Authentication
```bash
# This should return 401 Unauthorized
curl -X GET http://localhost:8080/api/v1/users/profile

# With valid JWT token
curl -X GET http://localhost:8080/api/v1/users/profile \
  -H "Authorization: Bearer your-jwt-token"
```

## Deployment

### Kubernetes Deployment

1. **Create Namespace**:
```bash
kubectl create namespace travelowkey
```

2. **Apply Secrets**:
```bash
kubectl create secret generic api-gateway-secrets \
  --from-literal=jwt-secret="your-production-jwt-secret" \
  -n travelowkey
```

3. **Deploy to Kubernetes**:
```bash
kubectl apply -f k8s/ -n travelowkey
```

4. **Check Deployment Status**:
```bash
kubectl get pods -n travelowkey -l app=api-gateway
kubectl get svc -n travelowkey api-gateway
```

### Helm Deployment (Alternative)

```bash
helm install api-gateway ./helm-chart \
  --namespace travelowkey \
  --set image.tag=latest \
  --set secrets.jwtSecret="your-jwt-secret"
```

## Monitoring

### Health Checks
- **Liveness**: `/actuator/health/liveness`
- **Readiness**: `/actuator/health/readiness`
- **General Health**: `/actuator/health`

### Metrics
- **Prometheus**: `/actuator/prometheus`
- **General Metrics**: `/actuator/metrics`

### Circuit Breaker Status
```bash
curl http://localhost:8080/actuator/health | jq '.components.circuitBreakers'
```

## Security Considerations

### Production Checklist
- [ ] Change default JWT secret
- [ ] Configure OAuth providers (Google, Facebook)
- [ ] Enable HTTPS with proper certificates
- [ ] Set up proper CORS origins
- [ ] Configure rate limiting appropriately
- [ ] Review and test circuit breaker settings
- [ ] Enable security headers
- [ ] Set up proper logging and monitoring

### Rate Limiting
Default rate limits:
- 10 requests per second per user
- Circuit breaker triggers after 50% failure rate
- 30-second timeout for circuit breaker recovery

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**:
   - Check Redis connectivity: `redis-cli ping`
   - Verify REDIS_HOST and REDIS_PORT environment variables

2. **JWT Validation Errors**:
   - Ensure JWT_SECRET matches the Auth Service secret
   - Check token expiration and format

3. **Circuit Breaker Open**:
   - Check downstream service health
   - Review circuit breaker metrics
   - Wait for automatic recovery or restart services

4. **CORS Issues**:
   - Verify allowed origins in SecurityConfig
   - Check browser network console for CORS errors

### Logs
```bash
# View application logs
kubectl logs -f deployment/api-gateway -n travelowkey

# View specific container logs
docker logs -f api-gateway
```

## API Documentation

### Public Endpoints
- `GET /actuator/health` - Health check
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration

### Protected Endpoints
All other `/api/v1/**` endpoints require valid JWT authentication.

### Admin Endpoints
`/api/v1/admin/**` endpoints require ADMIN or SUPER_ADMIN role.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

Copyright © 2024 Travelowkey. All rights reserved.