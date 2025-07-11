package com.travelowkey.user.model;

/**
 * Loyalty tier levels for the Travelowkey rewards program
 */
public enum LoyaltyTier {
    /**
     * Bronze tier - New users, 0-999 points
     */
    BRONZE("Bronze", 0, 1.0),
    
    /**
     * Silver tier - Regular users, 1,000-9,999 points
     */
    SILVER("Silver", 1000, 1.1),
    
    /**
     * Gold tier - Frequent travelers, 10,000-49,999 points
     */
    GOLD("Gold", 10000, 1.25),
    
    /**
     * Platinum tier - Premium travelers, 50,000-99,999 points
     */
    PLATINUM("Platinum", 50000, 1.5),
    
    /**
     * Diamond tier - VIP travelers, 100,000+ points
     */
    DIAMOND("Diamond", 100000, 2.0);
    
    private final String displayName;
    private final int minimumPoints;
    private final double pointsMultiplier;
    
    LoyaltyTier(String displayName, int minimumPoints, double pointsMultiplier) {
        this.displayName = displayName;
        this.minimumPoints = minimumPoints;
        this.pointsMultiplier = pointsMultiplier;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public int getMinimumPoints() {
        return minimumPoints;
    }
    
    public double getPointsMultiplier() {
        return pointsMultiplier;
    }
    
    /**
     * Check if this tier has VIP status
     */
    public boolean isVip() {
        return this == PLATINUM || this == DIAMOND;
    }
    
    /**
     * Check if this tier has priority support access
     */
    public boolean hasPrioritySupport() {
        return this == GOLD || this == PLATINUM || this == DIAMOND;
    }
    
    /**
     * Get the next tier level
     */
    public LoyaltyTier getNextTier() {
        switch (this) {
            case BRONZE: return SILVER;
            case SILVER: return GOLD;
            case GOLD: return PLATINUM;
            case PLATINUM: return DIAMOND;
            default: return DIAMOND;
        }
    }
    
    /**
     * Get points needed to reach next tier
     */
    public int getPointsToNextTier(int currentPoints) {
        LoyaltyTier nextTier = getNextTier();
        if (nextTier == this) {
            return 0; // Already at highest tier
        }
        return Math.max(0, nextTier.getMinimumPoints() - currentPoints);
    }
}