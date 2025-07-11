package com.travelowkey.user;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;

/**
 * --- Security Hardening Enhancements (Phase 6) ---
 * - mTLS is enforced at the infrastructure level (e.g., Istio in Kubernetes)
 * - JWT validation: ensure all protected endpoints require JWT
 * - RBAC: Use .hasRole() or .hasAuthority() for sensitive endpoints
 * - Rate limiting: Integrate Bucket4j or Redis-based rate limiting (see controller for example)
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .csrf().and() // CSRF protection enabled by default
            .authorizeRequests()
                .antMatchers("/auth/**", "/health").permitAll()
                .antMatchers("/admin/**").hasRole("ADMIN") // RBAC example
                .anyRequest().authenticated()
            .and()
            .oauth2ResourceServer().jwt(); // JWT validation
    }
}