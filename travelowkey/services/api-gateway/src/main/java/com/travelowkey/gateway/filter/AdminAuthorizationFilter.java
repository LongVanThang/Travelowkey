package com.travelowkey.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Admin Authorization Filter for API Gateway
 * 
 * This filter ensures that only users with ADMIN role
 * can access admin endpoints. It works in conjunction
 * with the JWT authentication filter.
 */
@Component
public class AdminAuthorizationFilter extends AbstractGatewayFilterFactory<AdminAuthorizationFilter.Config> {

    public AdminAuthorizationFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            ServerHttpResponse response = exchange.getResponse();

            // Check if user role header exists (added by JWT filter)
            List<String> userRoleHeaders = request.getHeaders().get("X-User-Role");
            
            if (userRoleHeaders == null || userRoleHeaders.isEmpty()) {
                return handleForbidden(response, "User role not found in request");
            }

            String userRole = userRoleHeaders.get(0);
            
            // Check if user has admin role
            if (!"ADMIN".equalsIgnoreCase(userRole) && !"SUPER_ADMIN".equalsIgnoreCase(userRole)) {
                return handleForbidden(response, "Insufficient privileges. Admin access required.");
            }

            // User is authorized, continue with the request
            return chain.filter(exchange);
        };
    }

    private Mono<Void> handleForbidden(ServerHttpResponse response, String message) {
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().add("Content-Type", "application/json");
        
        String body = "{\"error\":\"Forbidden\",\"message\":\"" + message + "\"}";
        
        return response.writeWith(
            Mono.just(response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8)))
        );
    }

    public static class Config {
        // Configuration properties if needed
    }
}