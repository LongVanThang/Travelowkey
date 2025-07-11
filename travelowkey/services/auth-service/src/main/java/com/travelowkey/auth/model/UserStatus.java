package com.travelowkey.auth.model;

/**
 * User account status for account lifecycle management
 */
public enum UserStatus {
    /**
     * User registered but email not verified
     */
    PENDING_VERIFICATION,
    
    /**
     * User account is active and can be used
     */
    ACTIVE,
    
    /**
     * User account is temporarily suspended
     */
    SUSPENDED,
    
    /**
     * User account is locked due to security issues
     */
    LOCKED,
    
    /**
     * User account is permanently banned
     */
    BANNED,
    
    /**
     * User account is deactivated by user request
     */
    DEACTIVATED,
    
    /**
     * User account is in deletion process (GDPR)
     */
    PENDING_DELETION,
    
    /**
     * User account is deleted
     */
    DELETED;
    
    /**
     * Check if this status allows login
     */
    public boolean canLogin() {
        return this == ACTIVE;
    }
    
    /**
     * Check if this status is considered active
     */
    public boolean isActive() {
        return this == ACTIVE;
    }
    
    /**
     * Check if this status indicates a blocked account
     */
    public boolean isBlocked() {
        return this == SUSPENDED || 
               this == LOCKED || 
               this == BANNED;
    }
    
    /**
     * Check if this status indicates the account needs verification
     */
    public boolean needsVerification() {
        return this == PENDING_VERIFICATION;
    }
}