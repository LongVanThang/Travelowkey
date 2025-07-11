package com.travelowkey.user.model;

/**
 * Profile visibility levels for user privacy control
 */
public enum ProfileVisibility {
    /**
     * Profile is completely private
     */
    PRIVATE,
    
    /**
     * Profile visible to friends only
     */
    FRIENDS_ONLY,
    
    /**
     * Profile visible to other Travelowkey users
     */
    USERS_ONLY,
    
    /**
     * Profile is publicly visible
     */
    PUBLIC
}