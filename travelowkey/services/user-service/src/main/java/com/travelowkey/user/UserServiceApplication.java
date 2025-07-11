package com.travelowkey.user;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Main application class for Travelowkey User Service
 * 
 * This service handles:
 * - User profile management
 * - Travel preferences and history
 * - Loyalty points and rewards
 * - GDPR compliance features
 * - User analytics and insights
 */
@SpringBootApplication
@EnableKafka
@EnableAsync
@EnableTransactionManagement
public class UserServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}