# Multi-stage Dockerfile for API Gateway
FROM maven:3.9.5-openjdk-17-slim AS builder

WORKDIR /app

# Copy pom.xml first to leverage Docker cache
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Production image
FROM openjdk:17-jre-slim

# Create non-root user for security
RUN groupadd -r travelowkey && useradd -r -g travelowkey travelowkey

# Install necessary packages and clean up
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the built JAR file
COPY --from=builder /app/target/api-gateway-*.jar app.jar

# Change ownership to non-root user
RUN chown -R travelowkey:travelowkey /app

# Switch to non-root user
USER travelowkey

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# JVM optimizations for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:+UseG1GC \
               -XX:+UseStringDeduplication \
               -Djava.security.egd=file:/dev/./urandom"

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]