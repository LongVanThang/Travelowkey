package com.travelowkey.gateway.config;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * --- Observability & Monitoring Enhancements (Phase 7) ---
 * - Prometheus metrics: Exposed via /actuator/prometheus (Spring Boot Actuator + Micrometer)
 * - Jaeger tracing: Add spring-cloud-starter-sleuth + spring-cloud-sleuth-otel-autoconfigure
 * - Centralized logging: Use Logback/Log4j2 to ship logs to ELK stack
 * - Grafana dashboards: Use Prometheus metrics for dashboard panels
 * - K8s probes: /actuator/health, /actuator/ready, /actuator/prometheus endpoints
 */
@Configuration
public class ObservabilityConfig {
    @Bean
    MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> registry.config().commonTags("service", "api-gateway");
    }
}

@RestController
class ReadinessController {
    @GetMapping("/ready")
    public Map<String, Object> ready() {
        // Add readiness checks as needed (e.g., DB, Redis, Kafka)
        return Map.of("status", "ready", "timestamp", Instant.now());
    }
}