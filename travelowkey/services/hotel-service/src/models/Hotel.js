const { v4: uuidv4 } = require('uuid');

class Hotel {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.description = data.description || '';
    this.shortDescription = data.shortDescription || '';
    
    // Location information
    this.location = {
      country: data.location?.country || '',
      countryCode: data.location?.countryCode || '',
      state: data.location?.state || '',
      city: data.location?.city || '',
      district: data.location?.district || '',
      address: data.location?.address || '',
      postalCode: data.location?.postalCode || '',
      coordinates: {
        lat: data.location?.coordinates?.lat || 0,
        lon: data.location?.coordinates?.lon || 0
      },
      timezone: data.location?.timezone || 'UTC',
      locality: data.location?.locality || '',
      landmark: data.location?.landmark || ''
    };

    // Hotel classification
    this.category = data.category || 'mid-range'; // budget, mid-range, luxury, boutique, resort
    this.starRating = data.starRating || 3;
    this.guestRating = data.guestRating || 0;
    this.reviewCount = data.reviewCount || 0;
    this.propertyType = data.propertyType || 'hotel'; // hotel, resort, apartment, villa, hostel

    // Pricing information
    this.priceRange = {
      min: data.priceRange?.min || 0,
      max: data.priceRange?.max || 0,
      currency: data.priceRange?.currency || 'USD',
      taxesIncluded: data.priceRange?.taxesIncluded || false
    };

    // Amenities and features
    this.amenities = data.amenities || [];
    this.features = data.features || [];
    this.accessibility = data.accessibility || [];
    this.languages = data.languages || ['en'];

    // Business information
    this.contact = {
      phone: data.contact?.phone || '',
      email: data.contact?.email || '',
      website: data.contact?.website || '',
      fax: data.contact?.fax || ''
    };

    // Policies
    this.policies = {
      checkIn: data.policies?.checkIn || '15:00',
      checkOut: data.policies?.checkOut || '11:00',
      cancellation: data.policies?.cancellation || '',
      petPolicy: data.policies?.petPolicy || '',
      childPolicy: data.policies?.childPolicy || '',
      smokingPolicy: data.policies?.smokingPolicy || 'non-smoking',
      paymentMethods: data.policies?.paymentMethods || [],
      ageRestriction: data.policies?.ageRestriction || 0
    };

    // Images and media
    this.images = data.images || [];
    this.videos = data.videos || [];
    this.virtualTour = data.virtualTour || '';

    // Room types
    this.roomTypes = data.roomTypes || [];

    // Status and operational info
    this.status = data.status || 'active'; // active, inactive, maintenance, closed
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.isVerified = data.isVerified || false;
    this.isFeatured = data.isFeatured || false;
    this.isPromoted = data.isPromoted || false;

    // Sustainability and certifications
    this.sustainabilityCertifications = data.sustainabilityCertifications || [];
    this.greenPractices = data.greenPractices || [];
    this.awards = data.awards || [];

    // Nearby attractions and transportation
    this.nearbyAttractions = data.nearbyAttractions || [];
    this.transportation = {
      airports: data.transportation?.airports || [],
      publicTransport: data.transportation?.publicTransport || [],
      parking: data.transportation?.parking || {}
    };

    // Business facilities
    this.businessFacilities = data.businessFacilities || [];
    this.meetingRooms = data.meetingRooms || [];

    // Health and safety
    this.healthSafety = {
      covidMeasures: data.healthSafety?.covidMeasures || [],
      emergencyInfo: data.healthSafety?.emergencyInfo || {},
      medicalServices: data.healthSafety?.medicalServices || []
    };

    // Food and dining
    this.dining = {
      restaurants: data.dining?.restaurants || [],
      roomService: data.dining?.roomService || false,
      specialDiets: data.dining?.specialDiets || []
    };

    // Entertainment and activities
    this.entertainment = {
      activities: data.entertainment?.activities || [],
      facilities: data.entertainment?.facilities || [],
      kidsClub: data.entertainment?.kidsClub || false
    };

    // Metadata
    this.metadata = {
      source: data.metadata?.source || 'manual',
      externalIds: data.metadata?.externalIds || {},
      lastVerified: data.metadata?.lastVerified || null,
      dataQuality: data.metadata?.dataQuality || 'basic'
    };

    // Timestamps
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.lastInventoryUpdate = data.lastInventoryUpdate || new Date();
  }

  // Validation methods
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Hotel name is required');
    }

    if (!this.location.city || this.location.city.trim().length === 0) {
      errors.push('Hotel city is required');
    }

    if (!this.location.country || this.location.country.trim().length === 0) {
      errors.push('Hotel country is required');
    }

    if (!this.category || !['budget', 'mid-range', 'luxury', 'boutique', 'resort'].includes(this.category)) {
      errors.push('Valid hotel category is required');
    }

    if (this.starRating < 1 || this.starRating > 5) {
      errors.push('Star rating must be between 1 and 5');
    }

    if (this.guestRating < 0 || this.guestRating > 10) {
      errors.push('Guest rating must be between 0 and 10');
    }

    if (this.location.coordinates.lat < -90 || this.location.coordinates.lat > 90) {
      errors.push('Latitude must be between -90 and 90');
    }

    if (this.location.coordinates.lon < -180 || this.location.coordinates.lon > 180) {
      errors.push('Longitude must be between -180 and 180');
    }

    return errors;
  }

  // Business logic methods
  updateGuestRating(newRating, newReviewCount) {
    if (this.reviewCount === 0) {
      this.guestRating = newRating;
      this.reviewCount = newReviewCount;
    } else {
      const totalRating = (this.guestRating * this.reviewCount) + (newRating * newReviewCount);
      this.reviewCount += newReviewCount;
      this.guestRating = totalRating / this.reviewCount;
    }
    this.updatedAt = new Date();
  }

  addAmenity(amenity) {
    if (!this.amenities.includes(amenity)) {
      this.amenities.push(amenity);
      this.updatedAt = new Date();
    }
  }

  removeAmenity(amenity) {
    const index = this.amenities.indexOf(amenity);
    if (index > -1) {
      this.amenities.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  addRoomType(roomType) {
    if (!this.roomTypes.find(rt => rt.id === roomType.id)) {
      this.roomTypes.push(roomType);
      this.updatedAt = new Date();
    }
  }

  updatePriceRange(min, max, currency = 'USD') {
    this.priceRange.min = min;
    this.priceRange.max = max;
    this.priceRange.currency = currency;
    this.updatedAt = new Date();
  }

  setLocation(coordinates) {
    this.location.coordinates = coordinates;
    this.updatedAt = new Date();
  }

  deactivate() {
    this.isActive = false;
    this.status = 'inactive';
    this.updatedAt = new Date();
  }

  activate() {
    this.isActive = true;
    this.status = 'active';
    this.updatedAt = new Date();
  }

  // Transform methods for different outputs
  toElasticsearchDocument() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      location: this.location,
      category: this.category,
      starRating: this.starRating,
      guestRating: this.guestRating,
      reviewCount: this.reviewCount,
      priceRange: this.priceRange,
      amenities: this.amenities,
      features: this.features,
      policies: this.policies,
      contact: this.contact,
      images: this.images,
      roomTypes: this.roomTypes,
      status: this.status,
      isActive: this.isActive,
      sustainabilityCertifications: this.sustainabilityCertifications,
      accessibility: this.accessibility,
      nearbyAttractions: this.nearbyAttractions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastInventoryUpdate: this.lastInventoryUpdate
    };
  }

  toPublicJson() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      shortDescription: this.shortDescription,
      location: this.location,
      category: this.category,
      starRating: this.starRating,
      guestRating: this.guestRating,
      reviewCount: this.reviewCount,
      priceRange: this.priceRange,
      amenities: this.amenities,
      features: this.features,
      accessibility: this.accessibility,
      policies: this.policies,
      contact: {
        phone: this.contact.phone,
        website: this.contact.website
      },
      images: this.images,
      roomTypes: this.roomTypes,
      sustainabilityCertifications: this.sustainabilityCertifications,
      nearbyAttractions: this.nearbyAttractions,
      dining: this.dining,
      entertainment: this.entertainment
    };
  }

  toSearchResult() {
    return {
      id: this.id,
      name: this.name,
      shortDescription: this.shortDescription,
      location: {
        city: this.location.city,
        country: this.location.country,
        address: this.location.address,
        coordinates: this.location.coordinates
      },
      category: this.category,
      starRating: this.starRating,
      guestRating: this.guestRating,
      reviewCount: this.reviewCount,
      priceRange: this.priceRange,
      amenities: this.amenities.slice(0, 5), // Show only top 5 amenities
      images: this.images.filter(img => img.isPrimary).slice(0, 3),
      isFeatured: this.isFeatured,
      isPromoted: this.isPromoted
    };
  }

  static fromElasticsearchDocument(doc) {
    return new Hotel(doc._source || doc);
  }
}

module.exports = Hotel;