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

// Placeholder for controller package
package com.travelowkey.user.controller;

// Placeholder for service package
package com.travelowkey.user.service;

// Placeholder for dto package
package com.travelowkey.user.dto;

// Placeholder for repository package
package com.travelowkey.user.repository;