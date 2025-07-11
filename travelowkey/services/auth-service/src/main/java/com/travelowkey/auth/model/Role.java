package com.travelowkey.auth.model;

/**
 * User roles for authorization and access control
 */
public enum Role {
    /**
     * Regular user with standard access
     */
    USER,
    
    /**
     * Premium user with additional features
     */
    PREMIUM_USER,
    
    /**
     * Travel agent with booking management capabilities
     */
    TRAVEL_AGENT,
    
    /**
     * Hotel manager with hotel management access
     */
    HOTEL_MANAGER,
    
    /**
     * Airline manager with flight management access
     */
    AIRLINE_MANAGER,
    
    /**
     * Car rental manager with fleet management access
     */
    CAR_MANAGER,
    
    /**
     * Customer support representative
     */
    SUPPORT,
    
    /**
     * Content moderator for reviews and content
     */
    MODERATOR,
    
    /**
     * Administrator with elevated privileges
     */
    ADMIN,
    
    /**
     * Super administrator with full system access
     */
    SUPER_ADMIN;
    
    /**
     * Check if this role has administrative privileges
     */
    public boolean isAdmin() {
        return this == ADMIN || this == SUPER_ADMIN;
    }
    
    /**
     * Check if this role has management privileges
     */
    public boolean isManager() {
        return this == HOTEL_MANAGER || 
               this == AIRLINE_MANAGER || 
               this == CAR_MANAGER || 
               isAdmin();
    }
    
    /**
     * Check if this role has support privileges
     */
    public boolean isSupport() {
        return this == SUPPORT || 
               this == MODERATOR || 
               isAdmin();
    }
}