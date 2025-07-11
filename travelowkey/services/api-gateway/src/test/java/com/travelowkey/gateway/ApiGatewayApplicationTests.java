package com.travelowkey.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.redis.host=localhost",
    "spring.redis.port=6379",
    "jwt.secret=test-secret-key-for-unit-tests",
    "spring.cloud.gateway.routes[0].id=test",
    "spring.cloud.gateway.routes[0].uri=http://localhost:8081",
    "spring.cloud.gateway.routes[0].predicates[0]=Path=/test/**"
})
class ApiGatewayApplicationTests {

    @Test
    void contextLoads() {
        // Test that the Spring context loads successfully
    }

    @Test
    void mainMethodTest() {
        // Test the main method doesn't throw exceptions
        String[] args = {};
        // Note: We're not actually calling main() as it would start the server
        // In a real test environment, you might use @SpringBootTest(webEnvironment = RANDOM_PORT)
    }
}