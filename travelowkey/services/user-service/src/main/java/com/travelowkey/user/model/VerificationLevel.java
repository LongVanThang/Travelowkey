package com.travelowkey.user.model;

/**
 * Verification levels for user account security and trust
 */
public enum VerificationLevel {
    /**
     * Basic verification - Email verified only
     */
    BASIC,
    
    /**
     * Phone verification - Email and phone verified
     */
    PHONE_VERIFIED,
    
    /**
     * Identity verification - Government ID verified
     */
    IDENTITY_VERIFIED,
    
    /**
     * Full verification - All documents and background checks complete
     */
    FULLY_VERIFIED
}