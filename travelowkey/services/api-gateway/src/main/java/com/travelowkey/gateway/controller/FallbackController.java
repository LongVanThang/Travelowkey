package com.travelowkey.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Fallback Controller for Circuit Breaker
 * 
 * Provides fallback responses when downstream services
 * are unavailable or experiencing high error rates.
 */
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/auth")
    public ResponseEntity<Map<String, Object>> authFallback() {
        return createFallbackResponse(
            "Authentication service is temporarily unavailable",
            "AUTH_SERVICE_DOWN"
        );
    }

    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> userFallback() {
        return createFallbackResponse(
            "User service is temporarily unavailable",
            "USER_SERVICE_DOWN"
        );
    }

    @GetMapping("/flight")
    public ResponseEntity<Map<String, Object>> flightFallback() {
        return createFallbackResponse(
            "Flight service is temporarily unavailable",
            "FLIGHT_SERVICE_DOWN"
        );
    }

    @GetMapping("/hotel")
    public ResponseEntity<Map<String, Object>> hotelFallback() {
        return createFallbackResponse(
            "Hotel service is temporarily unavailable",
            "HOTEL_SERVICE_DOWN"
        );
    }

    @GetMapping("/car")
    public ResponseEntity<Map<String, Object>> carFallback() {
        return createFallbackResponse(
            "Car rental service is temporarily unavailable",
            "CAR_SERVICE_DOWN"
        );
    }

    @GetMapping("/booking")
    public ResponseEntity<Map<String, Object>> bookingFallback() {
        return createFallbackResponse(
            "Booking service is temporarily unavailable",
            "BOOKING_SERVICE_DOWN"
        );
    }

    @GetMapping("/payment")
    public ResponseEntity<Map<String, Object>> paymentFallback() {
        return createFallbackResponse(
            "Payment service is temporarily unavailable",
            "PAYMENT_SERVICE_DOWN"
        );
    }

    @GetMapping("/review")
    public ResponseEntity<Map<String, Object>> reviewFallback() {
        return createFallbackResponse(
            "Review service is temporarily unavailable",
            "REVIEW_SERVICE_DOWN"
        );
    }

    @GetMapping("/admin")
    public ResponseEntity<Map<String, Object>> adminFallback() {
        return createFallbackResponse(
            "Admin service is temporarily unavailable",
            "ADMIN_SERVICE_DOWN"
        );
    }

    private ResponseEntity<Map<String, Object>> createFallbackResponse(String message, String errorCode) {
        Map<String, Object> response = new HashMap<>();
        response.put("error", "Service Unavailable");
        response.put("message", message);
        response.put("errorCode", errorCode);
        response.put("timestamp", LocalDateTime.now());
        response.put("status", HttpStatus.SERVICE_UNAVAILABLE.value());
        response.put("retryAfter", "Please try again in a few moments");
        
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }
}