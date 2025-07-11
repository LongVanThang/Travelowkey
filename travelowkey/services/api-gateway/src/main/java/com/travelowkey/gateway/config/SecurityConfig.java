package com.travelowkey.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;

/**
 * Security Configuration for API Gateway
 * 
 * Configures CORS, CSRF protection, and security headers
 * for the gateway. Authentication is handled by custom filters.
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    /**
     * --- Security Hardening Enhancements (Phase 6) ---
     * - mTLS is enforced at the infrastructure level (e.g., Istio in Kubernetes)
     * - JWT validation is handled by a custom filter (ensure all protected endpoints require JWT)
     * - RBAC: Use .hasRole() or .hasAuthority() for sensitive endpoints
     * - Rate limiting: Integrate Bucket4j or Redis-based rate limiting as a WebFilter
     */

    // Example RBAC (add to authorizeExchange):
    // .pathMatchers("/api/v1/admin/**").hasRole("ADMIN")
    // .pathMatchers("/api/v1/user/**").hasAnyRole("USER", "ADMIN")

    // Example rate limiting (pseudo-code):
    // http.addFilterBefore(new RateLimitingWebFilter(), SecurityWebFiltersOrder.AUTHORIZATION);

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeExchange(exchanges -> exchanges
                // Public endpoints
                .pathMatchers("/actuator/health", "/actuator/info", "/actuator/prometheus").permitAll()
                .pathMatchers("/fallback/**").permitAll()
                .pathMatchers("/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh").permitAll()
                .pathMatchers("/api/v1/auth/forgot-password", "/api/v1/auth/reset-password").permitAll()
                // All other requests require authentication (handled by JWT filter)
                .anyExchange().authenticated()
            )
            .headers(headers -> headers
                .frameOptions(frameOptions -> frameOptions.deny())
                .contentTypeOptions(contentTypeOptions -> contentTypeOptions.and())
                .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                    .maxAgeInSeconds(31536000)
                    .includeSubdomains(true)
                )
            )
            .build();
    }

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();
        
        // Configure allowed origins (adjust for production)
        corsConfig.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:3000",
            "http://localhost:3001", 
            "https://*.travelowkey.com",
            "https://travelowkey.com"
        ));
        
        // Configure allowed methods
        corsConfig.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));
        
        // Configure allowed headers
        corsConfig.setAllowedHeaders(Arrays.asList(
            "authorization",
            "content-type",
            "x-requested-with",
            "x-user-id",
            "x-correlation-id",
            "cache-control"
        ));
        
        // Allow credentials
        corsConfig.setAllowCredentials(true);
        
        // Configure exposed headers
        corsConfig.setExposedHeaders(Arrays.asList(
            "x-total-count",
            "x-correlation-id"
        ));
        
        // Cache preflight response for 1 hour
        corsConfig.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);
        
        return new CorsWebFilter(source);
    }
}