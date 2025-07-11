package com.travelowkey.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import reactor.core.publisher.Mono;

/**
 * Main application class for Travelowkey API Gateway
 * 
 * This gateway serves as the single entry point for all client requests,
 * routing them to appropriate microservices while providing cross-cutting
 * concerns like authentication, rate limiting, and circuit breaking.
 */
@SpringBootApplication
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }

    /**
     * Configure routes for all microservices
     */
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
            // Auth Service Routes
            .route("auth-service", r -> r
                .path("/api/v1/auth/**")
                .filters(f -> f
                    .circuitBreaker(config -> config
                        .setName("auth-circuit-breaker")
                        .setFallbackUri("forward:/fallback/auth"))
                    .requestRateLimiter(config -> config
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("lb://auth-service"))
            
            // User Service Routes
            .route("user-service", r -> r
                .path("/api/v1/users/**")
                .filters(f -> f
                    .filter("JwtAuthenticationFilter")
                    .circuitBreaker(config -> config
                        .setName("user-circuit-breaker")
                        .setFallbackUri("forward:/fallback/user"))
                    .requestRateLimiter(config -> config
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("lb://user-service"))
            
            // Flight Service Routes
            .route("flight-service", r -> r
                .path("/api/v1/flights/**")
                .filters(f -> f
                    .filter("JwtAuthenticationFilter")
                    .circuitBreaker(config -> config
                        .setName("flight-circuit-breaker")
                        .setFallbackUri("forward:/fallback/flight"))
                    .requestRateLimiter(config -> config
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("http://flight-service:3003"))
            
            // Hotel Service Routes
            .route("hotel-service", r -> r
                .path("/api/v1/hotels/**")
                .filters(f -> f
                    .filter("JwtAuthenticationFilter")
                    .circuitBreaker(config -> config
                        .setName("hotel-circuit-breaker")
                        .setFallbackUri("forward:/fallback/hotel"))
                    .requestRateLimiter(config -> config
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("http://hotel-service:3004"))
            
            // Car Service Routes
            .route("car-service", r -> r
                .path("/api/v1/cars/**")
                .filters(f -> f
                    .filter("JwtAuthenticationFilter")
                    .circuitBreaker(config -> config
                        .setName("car-circuit-breaker")
                        .setFallbackUri("forward:/fallback/car"))
                    .requestRateLimiter(config -> config
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("http://car-service:3005"))
            
            // Booking Service Routes
            .route("booking-service", r -> r
                .path("/api/v1/bookings/**")
                .filters(f -> f
                    .filter("JwtAuthenticationFilter")
                    .circuitBreaker(config -> config
                        .setName("booking-circuit-breaker")
                        .setFallbackUri("forward:/fallback/booking"))
                    .requestRateLimiter(config -> config
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("http://booking-service:3006"))
            
            // Payment Service Routes
            .route("payment-service", r -> r
                .path("/api/v1/payments/**")
                .filters(f -> f
                    .filter("JwtAuthenticationFilter")
                    .circuitBreaker(config -> config
                        .setName("payment-circuit-breaker")
                        .setFallbackUri("forward:/fallback/payment"))
                    .requestRateLimiter(config -> config
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("http://payment-service:3007"))
            
            // Review Service Routes
            .route("review-service", r -> r
                .path("/api/v1/reviews/**")
                .filters(f -> f
                    .filter("JwtAuthenticationFilter")
                    .circuitBreaker(config -> config
                        .setName("review-circuit-breaker")
                        .setFallbackUri("forward:/fallback/review"))
                    .requestRateLimiter(config -> config
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("http://review-service:3008"))
            
            // Admin Service Routes
            .route("admin-service", r -> r
                .path("/api/v1/admin/**")
                .filters(f -> f
                    .filter("JwtAuthenticationFilter")
                    .filter("AdminAuthorizationFilter")
                    .circuitBreaker(config -> config
                        .setName("admin-circuit-breaker")
                        .setFallbackUri("forward:/fallback/admin"))
                    .requestRateLimiter(config -> config
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("http://admin-service:3010"))
            
            .build();
    }

    @Bean
    public RedisRateLimiter redisRateLimiter() {
        return new RedisRateLimiter(10, 20, 1);
    }

    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> exchange.getRequest()
            .getHeaders()
            .getFirst("X-User-Id") != null ?
            Mono.just(exchange.getRequest().getHeaders().getFirst("X-User-Id")) :
            Mono.just("anonymous");
    }
}