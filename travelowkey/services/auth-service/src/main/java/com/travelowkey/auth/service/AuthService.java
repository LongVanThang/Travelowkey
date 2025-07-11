package com.travelowkey.auth.service;

import com.travelowkey.auth.dto.*;
import com.travelowkey.auth.model.User;
import com.travelowkey.auth.model.UserStatus;
import com.travelowkey.auth.model.Role;
import com.travelowkey.auth.repository.UserRepository;
import com.travelowkey.auth.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Core authentication service for user management and JWT operations
 */
@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final MfaService mfaService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    public AuthService(UserRepository userRepository,
                      PasswordEncoder passwordEncoder,
                      JwtTokenProvider jwtTokenProvider,
                      AuthenticationManager authenticationManager,
                      EmailService emailService,
                      MfaService mfaService,
                      KafkaTemplate<String, Object> kafkaTemplate) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
        this.emailService = emailService;
        this.mfaService = mfaService;
        this.kafkaTemplate = kafkaTemplate;
    }

    /**
     * Register a new user
     */
    public JwtResponse register(RegisterRequest request) {
        // Validate request
        if (!request.isPasswordMatching()) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        // Check if user exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken");
        }

        // Create new user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setDateOfBirth(request.getDateOfBirth().atStartOfDay());
        user.setGdprConsent(request.getGdprConsent());
        user.setGdprConsentDate(LocalDateTime.now());
        user.setStatus(UserStatus.PENDING_VERIFICATION);
        user.addRole(Role.USER);

        // Generate email verification token
        String verificationToken = UUID.randomUUID().toString();
        user.setEmailVerificationToken(verificationToken);
        user.setEmailVerificationExpires(LocalDateTime.now().plusHours(24));

        user = userRepository.save(user);

        // Send verification email
        emailService.sendVerificationEmail(user.getEmail(), verificationToken);

        // Publish user registered event
        publishUserEvent("user.registered", user);

        // Return response without full JWT (email needs verification)
        return JwtResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roles(user.getRoles())
                .mfaEnabled(false)
                .build();
    }

    /**
     * Authenticate user and return JWT tokens
     */
    public JwtResponse login(LoginRequest request, String clientIp) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        // Check account status
        if (!user.getStatus().canLogin()) {
            throw new IllegalArgumentException("Account is not active");
        }

        // Check if account is locked
        if (!user.isAccountNonLocked()) {
            throw new IllegalArgumentException("Account is locked");
        }

        // Authenticate
        try {
            Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getEmail(),
                    request.getPassword()
                )
            );

            // Reset failed login attempts
            user.setFailedLoginAttempts(0);
            user.setAccountLockedUntil(null);

            // Check MFA if enabled
            if (user.isMfaEnabled()) {
                if (request.getMfaCode() == null || request.getMfaCode().trim().isEmpty()) {
                    // Return MFA required response
                    String mfaToken = jwtTokenProvider.generateMfaToken(user);
                    return JwtResponse.builder()
                            .mfaRequired(true)
                            .mfaToken(mfaToken)
                            .build();
                }

                // Verify MFA code
                if (!mfaService.verifyTotpCode(user.getMfaSecret(), request.getMfaCode())) {
                    throw new IllegalArgumentException("Invalid MFA code");
                }
            }

            // Update login info
            user.setLastLogin(LocalDateTime.now());
            user.setLastLoginIp(clientIp);
            userRepository.save(user);

            // Generate JWT tokens
            String accessToken = jwtTokenProvider.generateAccessToken(user);
            String refreshToken = jwtTokenProvider.generateRefreshToken(user);

            return JwtResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .expiresIn(jwtTokenProvider.getAccessTokenExpirationTime())
                    .userId(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .roles(user.getRoles())
                    .mfaEnabled(user.isMfaEnabled())
                    .build();

        } catch (Exception e) {
            // Increment failed login attempts
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            
            // Lock account after 5 failed attempts
            if (user.getFailedLoginAttempts() >= 5) {
                user.setAccountLockedUntil(LocalDateTime.now().plusMinutes(30));
            }
            
            userRepository.save(user);
            throw new IllegalArgumentException("Invalid credentials");
        }
    }

    /**
     * Refresh JWT access token
     */
    public JwtResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("Invalid refresh token");
        }

        String email = jwtTokenProvider.getEmailFromToken(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String newAccessToken = jwtTokenProvider.generateAccessToken(user);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(user);

        return JwtResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .expiresIn(jwtTokenProvider.getAccessTokenExpirationTime())
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roles(user.getRoles())
                .mfaEnabled(user.isMfaEnabled())
                .build();
    }

    /**
     * Logout user and blacklist token
     */
    public void logout(String accessToken) {
        jwtTokenProvider.blacklistToken(accessToken);
    }

    /**
     * Verify email with token
     */
    public void verifyEmail(String token) {
        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid verification token"));

        if (user.getEmailVerificationExpires().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Verification token expired");
        }

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpires(null);
        user.setStatus(UserStatus.ACTIVE);

        userRepository.save(user);

        // Publish user activated event
        publishUserEvent("user.activated", user);
    }

    /**
     * Request password reset
     */
    public void requestPasswordReset(PasswordResetRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Email not found"));

        String resetToken = UUID.randomUUID().toString();
        user.setPasswordResetToken(resetToken);
        user.setPasswordResetExpires(LocalDateTime.now().plusHours(2));

        userRepository.save(user);

        emailService.sendPasswordResetEmail(user.getEmail(), resetToken);
    }

    /**
     * Publish user events to Kafka
     */
    private void publishUserEvent(String eventType, User user) {
        try {
            UserEvent event = new UserEvent();
            event.setEventType(eventType);
            event.setUserId(user.getId());
            event.setEmail(user.getEmail());
            event.setUsername(user.getUsername());
            event.setTimestamp(LocalDateTime.now());
            
            kafkaTemplate.send("user_events", event);
        } catch (Exception e) {
            // Log error but don't fail the main operation
            System.err.println("Failed to publish user event: " + e.getMessage());
        }
    }
}

/**
 * User event DTO for Kafka messaging
 */
class UserEvent {
    private String eventType;
    private Long userId;
    private String email;
    private String username;
    private LocalDateTime timestamp;

    // Getters and setters
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}