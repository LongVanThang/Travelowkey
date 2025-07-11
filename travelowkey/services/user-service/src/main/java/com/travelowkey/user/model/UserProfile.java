package com.travelowkey.user.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * User profile entity for extended user information and preferences
 */
@Entity
@Table(name = "user_profiles", indexes = {
    @Index(name = "idx_user_profile_user_id", columnList = "user_id"),
    @Index(name = "idx_user_profile_email", columnList = "email"),
    @Index(name = "idx_user_profile_loyalty_tier", columnList = "loyalty_tier")
})
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true, nullable = false)
    private Long userId; // Reference to Auth Service user

    @NotBlank
    @Email
    @Size(max = 100)
    @Column(unique = true, nullable = false)
    private String email;

    @Size(max = 50)
    @Column(name = "first_name")
    private String firstName;

    @Size(max = 50)
    @Column(name = "last_name")
    private String lastName;

    @Size(max = 20)
    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "profile_picture_url")
    private String profilePictureUrl;

    @Size(max = 500)
    private String bio;

    @Size(max = 100)
    private String nationality;

    @Size(max = 100)
    private String occupation;

    // Address Information
    @Size(max = 255)
    @Column(name = "address_line1")
    private String addressLine1;

    @Size(max = 255)
    @Column(name = "address_line2")
    private String addressLine2;

    @Size(max = 100)
    private String city;

    @Size(max = 100)
    private String state;

    @Size(max = 20)
    @Column(name = "postal_code")
    private String postalCode;

    @Size(max = 100)
    private String country;

    // Emergency Contact
    @Size(max = 100)
    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Size(max = 20)
    @Column(name = "emergency_contact_phone")
    private String emergencyContactPhone;

    @Size(max = 100)
    @Column(name = "emergency_contact_relationship")
    private String emergencyContactRelationship;

    // Loyalty Program
    @Column(name = "loyalty_points", precision = 10, scale = 2)
    private BigDecimal loyaltyPoints = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "loyalty_tier")
    private LoyaltyTier loyaltyTier = LoyaltyTier.BRONZE;

    @Column(name = "total_bookings")
    private Integer totalBookings = 0;

    @Column(name = "total_spent", precision = 15, scale = 2)
    private BigDecimal totalSpent = BigDecimal.ZERO;

    // Preferences
    @OneToMany(mappedBy = "userProfile", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TravelPreference> travelPreferences = new ArrayList<>();

    @OneToMany(mappedBy = "userProfile", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PaymentMethod> paymentMethods = new ArrayList<>();

    // Privacy Settings
    @Column(name = "profile_visibility")
    @Enumerated(EnumType.STRING)
    private ProfileVisibility profileVisibility = ProfileVisibility.PRIVATE;

    @Column(name = "email_notifications")
    private Boolean emailNotifications = true;

    @Column(name = "sms_notifications")
    private Boolean smsNotifications = false;

    @Column(name = "push_notifications")
    private Boolean pushNotifications = true;

    @Column(name = "marketing_emails")
    private Boolean marketingEmails = false;

    // Account Status
    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Column(name = "verification_level")
    @Enumerated(EnumType.STRING)
    private VerificationLevel verificationLevel = VerificationLevel.BASIC;

    @Column(name = "last_active")
    private LocalDateTime lastActive;

    // GDPR Compliance
    @Column(name = "data_processing_consent")
    private Boolean dataProcessingConsent = false;

    @Column(name = "data_processing_consent_date")
    private LocalDateTime dataProcessingConsentDate;

    @Column(name = "data_retention_date")
    private LocalDateTime dataRetentionDate;

    // Audit Fields
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    // Constructors
    public UserProfile() {}

    public UserProfile(Long userId, String email, String firstName, String lastName) {
        this.userId = userId;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    // Utility Methods
    public String getFullName() {
        if (firstName != null && lastName != null) {
            return firstName + " " + lastName;
        } else if (firstName != null) {
            return firstName;
        } else if (lastName != null) {
            return lastName;
        }
        return email;
    }

    public void addLoyaltyPoints(BigDecimal points) {
        this.loyaltyPoints = this.loyaltyPoints.add(points);
        updateLoyaltyTier();
    }

    public void subtractLoyaltyPoints(BigDecimal points) {
        this.loyaltyPoints = this.loyaltyPoints.subtract(points);
        if (this.loyaltyPoints.compareTo(BigDecimal.ZERO) < 0) {
            this.loyaltyPoints = BigDecimal.ZERO;
        }
        updateLoyaltyTier();
    }

    private void updateLoyaltyTier() {
        if (loyaltyPoints.compareTo(new BigDecimal("100000")) >= 0) {
            this.loyaltyTier = LoyaltyTier.DIAMOND;
        } else if (loyaltyPoints.compareTo(new BigDecimal("50000")) >= 0) {
            this.loyaltyTier = LoyaltyTier.PLATINUM;
        } else if (loyaltyPoints.compareTo(new BigDecimal("10000")) >= 0) {
            this.loyaltyTier = LoyaltyTier.GOLD;
        } else if (loyaltyPoints.compareTo(new BigDecimal("1000")) >= 0) {
            this.loyaltyTier = LoyaltyTier.SILVER;
        } else {
            this.loyaltyTier = LoyaltyTier.BRONZE;
        }
    }

    public void recordBooking(BigDecimal amount) {
        this.totalBookings++;
        this.totalSpent = this.totalSpent.add(amount);
        
        // Award loyalty points (1 point per dollar spent)
        addLoyaltyPoints(amount);
    }

    public boolean canAccessFeature(String feature) {
        // Premium features based on loyalty tier
        switch (loyaltyTier) {
            case DIAMOND:
            case PLATINUM:
                return true; // Access to all features
            case GOLD:
                return !feature.equals("CONCIERGE_SERVICE");
            case SILVER:
                return !feature.equals("CONCIERGE_SERVICE") && !feature.equals("PRIORITY_SUPPORT");
            default:
                return !feature.startsWith("PREMIUM_");
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getNationality() { return nationality; }
    public void setNationality(String nationality) { this.nationality = nationality; }

    public String getOccupation() { return occupation; }
    public void setOccupation(String occupation) { this.occupation = occupation; }

    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }

    public String getAddressLine2() { return addressLine2; }
    public void setAddressLine2(String addressLine2) { this.addressLine2 = addressLine2; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }

    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }

    public String getEmergencyContactRelationship() { return emergencyContactRelationship; }
    public void setEmergencyContactRelationship(String emergencyContactRelationship) { this.emergencyContactRelationship = emergencyContactRelationship; }

    public BigDecimal getLoyaltyPoints() { return loyaltyPoints; }
    public void setLoyaltyPoints(BigDecimal loyaltyPoints) { this.loyaltyPoints = loyaltyPoints; }

    public LoyaltyTier getLoyaltyTier() { return loyaltyTier; }
    public void setLoyaltyTier(LoyaltyTier loyaltyTier) { this.loyaltyTier = loyaltyTier; }

    public Integer getTotalBookings() { return totalBookings; }
    public void setTotalBookings(Integer totalBookings) { this.totalBookings = totalBookings; }

    public BigDecimal getTotalSpent() { return totalSpent; }
    public void setTotalSpent(BigDecimal totalSpent) { this.totalSpent = totalSpent; }

    public List<TravelPreference> getTravelPreferences() { return travelPreferences; }
    public void setTravelPreferences(List<TravelPreference> travelPreferences) { this.travelPreferences = travelPreferences; }

    public List<PaymentMethod> getPaymentMethods() { return paymentMethods; }
    public void setPaymentMethods(List<PaymentMethod> paymentMethods) { this.paymentMethods = paymentMethods; }

    public ProfileVisibility getProfileVisibility() { return profileVisibility; }
    public void setProfileVisibility(ProfileVisibility profileVisibility) { this.profileVisibility = profileVisibility; }

    public Boolean getEmailNotifications() { return emailNotifications; }
    public void setEmailNotifications(Boolean emailNotifications) { this.emailNotifications = emailNotifications; }

    public Boolean getSmsNotifications() { return smsNotifications; }
    public void setSmsNotifications(Boolean smsNotifications) { this.smsNotifications = smsNotifications; }

    public Boolean getPushNotifications() { return pushNotifications; }
    public void setPushNotifications(Boolean pushNotifications) { this.pushNotifications = pushNotifications; }

    public Boolean getMarketingEmails() { return marketingEmails; }
    public void setMarketingEmails(Boolean marketingEmails) { this.marketingEmails = marketingEmails; }

    public Boolean getIsVerified() { return isVerified; }
    public void setIsVerified(Boolean isVerified) { this.isVerified = isVerified; }

    public VerificationLevel getVerificationLevel() { return verificationLevel; }
    public void setVerificationLevel(VerificationLevel verificationLevel) { this.verificationLevel = verificationLevel; }

    public LocalDateTime getLastActive() { return lastActive; }
    public void setLastActive(LocalDateTime lastActive) { this.lastActive = lastActive; }

    public Boolean getDataProcessingConsent() { return dataProcessingConsent; }
    public void setDataProcessingConsent(Boolean dataProcessingConsent) { this.dataProcessingConsent = dataProcessingConsent; }

    public LocalDateTime getDataProcessingConsentDate() { return dataProcessingConsentDate; }
    public void setDataProcessingConsentDate(LocalDateTime dataProcessingConsentDate) { this.dataProcessingConsentDate = dataProcessingConsentDate; }

    public LocalDateTime getDataRetentionDate() { return dataRetentionDate; }
    public void setDataRetentionDate(LocalDateTime dataRetentionDate) { this.dataRetentionDate = dataRetentionDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}