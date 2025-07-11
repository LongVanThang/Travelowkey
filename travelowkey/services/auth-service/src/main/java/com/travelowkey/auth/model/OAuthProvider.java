package com.travelowkey.auth.model;

/**
 * OAuth providers supported by the authentication service
 */
public enum OAuthProvider {
    /**
     * Google OAuth provider
     */
    GOOGLE("google"),
    
    /**
     * Facebook OAuth provider
     */
    FACEBOOK("facebook"),
    
    /**
     * Twitter OAuth provider
     */
    TWITTER("twitter"),
    
    /**
     * LinkedIn OAuth provider
     */
    LINKEDIN("linkedin"),
    
    /**
     * Apple OAuth provider
     */
    APPLE("apple"),
    
    /**
     * Microsoft OAuth provider
     */
    MICROSOFT("microsoft");
    
    private final String providerId;
    
    OAuthProvider(String providerId) {
        this.providerId = providerId;
    }
    
    /**
     * Get the provider ID string
     */
    public String getProviderId() {
        return providerId;
    }
    
    /**
     * Get OAuth provider by provider ID
     */
    public static OAuthProvider fromProviderId(String providerId) {
        for (OAuthProvider provider : values()) {
            if (provider.getProviderId().equals(providerId)) {
                return provider;
            }
        }
        throw new IllegalArgumentException("Unknown OAuth provider: " + providerId);
    }
    
    /**
     * Check if the provider is currently supported
     */
    public boolean isSupported() {
        return this == GOOGLE || this == FACEBOOK;
    }
}