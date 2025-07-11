package com.travelowkey.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Main application class for Travelowkey Auth Service
 * 
 * This service handles:
 * - User authentication and authorization
 * - JWT token generation and validation
 * - OAuth integration (Google, Facebook)
 * - Multi-factor authentication (TOTP)
 * - Password reset and recovery
 * - User registration and email verification
 */
@SpringBootApplication
@EnableKafka
@EnableAsync
@EnableTransactionManagement
public class AuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}