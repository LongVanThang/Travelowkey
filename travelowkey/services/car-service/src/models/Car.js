const { v4: uuidv4 } = require('uuid');

class Car {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.fleetId = data.fleetId;
    this.licensePlate = data.licensePlate;
    this.vin = data.vin; // Vehicle Identification Number
    
    // Basic vehicle information
    this.make = data.make; // Toyota, Honda, BMW, etc.
    this.model = data.model; // Camry, Civic, X3, etc.
    this.year = data.year;
    this.color = data.color;
    this.category = data.category; // economy, compact, intermediate, standard, full-size, premium, luxury, suv, van
    this.transmission = data.transmission || 'automatic'; // automatic, manual
    this.fuelType = data.fuelType || 'gasoline'; // gasoline, diesel, hybrid, electric
    
    // Capacity and specifications
    this.seatingCapacity = data.seatingCapacity || 5;
    this.doorCount = data.doorCount || 4;
    this.luggageCapacity = data.luggageCapacity || 2; // Large bags
    this.airConditioning = data.airConditioning !== false;
    this.engineSize = data.engineSize || 2.0; // in liters
    this.fuelCapacity = data.fuelCapacity || 50; // in liters
    
    // Features and amenities
    this.features = data.features || [];
    this.safetyFeatures = data.safetyFeatures || [];
    this.entertainmentFeatures = data.entertainmentFeatures || [];
    this.comfortFeatures = data.comfortFeatures || [];
    
    // Location and availability
    this.currentLocation = {
      locationId: data.currentLocation?.locationId || null,
      address: data.currentLocation?.address || '',
      city: data.currentLocation?.city || '',
      state: data.currentLocation?.state || '',
      country: data.currentLocation?.country || '',
      coordinates: {
        lat: data.currentLocation?.coordinates?.lat || 0,
        lon: data.currentLocation?.coordinates?.lon || 0
      },
      timezone: data.currentLocation?.timezone || 'UTC',
      lastUpdated: data.currentLocation?.lastUpdated || new Date()
    };
    
    // Status and availability
    this.status = data.status || 'available'; // available, rented, maintenance, out-of-service, transit
    this.availability = {
      isAvailable: data.availability?.isAvailable !== false,
      reason: data.availability?.reason || '',
      nextAvailableDate: data.availability?.nextAvailableDate || null,
      restrictions: data.availability?.restrictions || []
    };
    
    // Current rental information
    this.currentRental = {
      bookingId: data.currentRental?.bookingId || null,
      customerId: data.currentRental?.customerId || null,
      startDate: data.currentRental?.startDate || null,
      endDate: data.currentRental?.endDate || null,
      mileageOut: data.currentRental?.mileageOut || null,
      fuelLevelOut: data.currentRental?.fuelLevelOut || null
    };
    
    // Vehicle condition
    this.condition = {
      overall: data.condition?.overall || 'excellent', // excellent, good, fair, poor
      exterior: data.condition?.exterior || 'excellent',
      interior: data.condition?.interior || 'excellent',
      mechanical: data.condition?.mechanical || 'excellent',
      cleanliness: data.condition?.cleanliness || 'clean', // clean, dirty, needs-cleaning
      damageReports: data.condition?.damageReports || [],
      lastInspection: data.condition?.lastInspection || null,
      inspectionDue: data.condition?.inspectionDue || null
    };
    
    // Mileage and usage
    this.mileage = {
      current: data.mileage?.current || 0,
      atPurchase: data.mileage?.atPurchase || 0,
      lastService: data.mileage?.lastService || 0,
      nextServiceDue: data.mileage?.nextServiceDue || 5000,
      totalRentalMiles: data.mileage?.totalRentalMiles || 0
    };
    
    // Maintenance and service
    this.maintenance = {
      lastServiceDate: data.maintenance?.lastServiceDate || null,
      nextServiceDate: data.maintenance?.nextServiceDate || null,
      serviceHistory: data.maintenance?.serviceHistory || [],
      maintenanceSchedule: data.maintenance?.maintenanceSchedule || [],
      warrantyInfo: data.maintenance?.warrantyInfo || {},
      isUnderMaintenance: data.maintenance?.isUnderMaintenance || false,
      maintenanceType: data.maintenance?.maintenanceType || null
    };
    
    // Financial information
    this.pricing = {
      dailyRate: data.pricing?.dailyRate || 0,
      weeklyRate: data.pricing?.weeklyRate || 0,
      monthlyRate: data.pricing?.monthlyRate || 0,
      weekendRate: data.pricing?.weekendRate || 0,
      currency: data.pricing?.currency || 'USD',
      insuranceRate: data.pricing?.insuranceRate || 0,
      seasonalPricing: data.pricing?.seasonalPricing || []
    };
    
    // Purchase and depreciation
    this.financial = {
      purchasePrice: data.financial?.purchasePrice || 0,
      purchaseDate: data.financial?.purchaseDate || null,
      currentValue: data.financial?.currentValue || 0,
      depreciationRate: data.financial?.depreciationRate || 0.15,
      totalRevenue: data.financial?.totalRevenue || 0,
      totalCosts: data.financial?.totalCosts || 0
    };
    
    // Insurance and legal
    this.insurance = {
      provider: data.insurance?.provider || '',
      policyNumber: data.insurance?.policyNumber || '',
      expiryDate: data.insurance?.expiryDate || null,
      coverage: data.insurance?.coverage || {},
      premiumAmount: data.insurance?.premiumAmount || 0
    };
    
    this.registration = {
      registrationNumber: data.registration?.registrationNumber || '',
      expiryDate: data.registration?.expiryDate || null,
      state: data.registration?.state || '',
      registrationType: data.registration?.registrationType || 'commercial'
    };
    
    // Tracking and telemetry
    this.tracking = {
      gpsDeviceId: data.tracking?.gpsDeviceId || null,
      lastGpsUpdate: data.tracking?.lastGpsUpdate || null,
      currentSpeed: data.tracking?.currentSpeed || 0,
      ignitionStatus: data.tracking?.ignitionStatus || 'off',
      fuelLevel: data.tracking?.fuelLevel || 100,
      batteryLevel: data.tracking?.batteryLevel || 100,
      temperatureAlerts: data.tracking?.temperatureAlerts || []
    };
    
    // Usage statistics
    this.usage = {
      totalRentals: data.usage?.totalRentals || 0,
      totalRentalDays: data.usage?.totalRentalDays || 0,
      averageRentalDuration: data.usage?.averageRentalDuration || 0,
      utilizationRate: data.usage?.utilizationRate || 0,
      lastRentalDate: data.usage?.lastRentalDate || null,
      popularSeasons: data.usage?.popularSeasons || [],
      customerRatings: data.usage?.customerRatings || []
    };
    
    // Images and documentation
    this.images = data.images || [];
    this.documents = data.documents || [];
    
    // Fleet management
    this.fleet = {
      assignedDriver: data.fleet?.assignedDriver || null,
      homeLocation: data.fleet?.homeLocation || null,
      routeAssignment: data.fleet?.routeAssignment || null,
      operationalArea: data.fleet?.operationalArea || [],
      restrictions: data.fleet?.restrictions || []
    };
    
    // Environmental impact
    this.environmental = {
      co2Emissions: data.environmental?.co2Emissions || 0, // g/km
      fuelEfficiency: data.environmental?.fuelEfficiency || 0, // km/l
      ecoRating: data.environmental?.ecoRating || 'C',
      electricRange: data.environmental?.electricRange || 0 // for electric/hybrid
    };
    
    // Quality and compliance
    this.compliance = {
      emissionStandard: data.compliance?.emissionStandard || 'Euro6',
      safetyRating: data.compliance?.safetyRating || '',
      certifications: data.compliance?.certifications || [],
      recalls: data.compliance?.recalls || []
    };
    
    // Timestamps
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.retiredAt = data.retiredAt || null;
  }
  
  // Validation methods
  validate() {
    const errors = [];
    
    if (!this.licensePlate || this.licensePlate.trim().length === 0) {
      errors.push('License plate is required');
    }
    
    if (!this.make || this.make.trim().length === 0) {
      errors.push('Car make is required');
    }
    
    if (!this.model || this.model.trim().length === 0) {
      errors.push('Car model is required');
    }
    
    if (!this.year || this.year < 1900 || this.year > new Date().getFullYear() + 1) {
      errors.push('Valid year is required');
    }
    
    if (!this.category || !this.isValidCategory(this.category)) {
      errors.push('Valid category is required');
    }
    
    if (this.seatingCapacity < 1 || this.seatingCapacity > 15) {
      errors.push('Seating capacity must be between 1 and 15');
    }
    
    if (this.pricing.dailyRate < 0) {
      errors.push('Daily rate cannot be negative');
    }
    
    return errors;
  }
  
  isValidCategory(category) {
    const validCategories = [
      'economy', 'compact', 'intermediate', 'standard', 
      'full-size', 'premium', 'luxury', 'suv', 'van'
    ];
    return validCategories.includes(category);
  }
  
  // Status management methods
  setAvailable() {
    this.status = 'available';
    this.availability.isAvailable = true;
    this.availability.reason = '';
    this.currentRental = {
      bookingId: null,
      customerId: null,
      startDate: null,
      endDate: null,
      mileageOut: null,
      fuelLevelOut: null
    };
    this.updatedAt = new Date();
  }
  
  setRented(bookingId, customerId, startDate, endDate, mileageOut, fuelLevelOut) {
    this.status = 'rented';
    this.availability.isAvailable = false;
    this.availability.reason = 'Currently rented';
    this.currentRental = {
      bookingId,
      customerId,
      startDate,
      endDate,
      mileageOut,
      fuelLevelOut
    };
    this.usage.totalRentals += 1;
    this.usage.lastRentalDate = startDate;
    this.updatedAt = new Date();
  }
  
  setMaintenance(maintenanceType, reason) {
    this.status = 'maintenance';
    this.availability.isAvailable = false;
    this.availability.reason = reason || 'Under maintenance';
    this.maintenance.isUnderMaintenance = true;
    this.maintenance.maintenanceType = maintenanceType;
    this.updatedAt = new Date();
  }
  
  completeMaintenance(serviceDetails) {
    this.status = 'available';
    this.availability.isAvailable = true;
    this.availability.reason = '';
    this.maintenance.isUnderMaintenance = false;
    this.maintenance.maintenanceType = null;
    this.maintenance.lastServiceDate = new Date();
    this.mileage.lastService = this.mileage.current;
    
    if (serviceDetails) {
      this.maintenance.serviceHistory.push({
        ...serviceDetails,
        date: new Date(),
        mileage: this.mileage.current
      });
    }
    
    this.updatedAt = new Date();
  }
  
  setOutOfService(reason) {
    this.status = 'out-of-service';
    this.availability.isAvailable = false;
    this.availability.reason = reason;
    this.updatedAt = new Date();
  }
  
  // Location management
  updateLocation(locationData) {
    this.currentLocation = {
      ...this.currentLocation,
      ...locationData,
      lastUpdated: new Date()
    };
    this.updatedAt = new Date();
  }
  
  // Condition management
  updateCondition(conditionData) {
    this.condition = {
      ...this.condition,
      ...conditionData,
      lastInspection: new Date()
    };
    this.updatedAt = new Date();
  }
  
  addDamageReport(damageReport) {
    this.condition.damageReports.push({
      ...damageReport,
      id: uuidv4(),
      reportedAt: new Date()
    });
    this.updatedAt = new Date();
  }
  
  // Mileage management
  updateMileage(newMileage) {
    if (newMileage > this.mileage.current) {
      const milesDriven = newMileage - this.mileage.current;
      this.mileage.current = newMileage;
      this.mileage.totalRentalMiles += milesDriven;
      this.updatedAt = new Date();
    }
  }
  
  // Financial methods
  addRevenue(amount) {
    this.financial.totalRevenue += amount;
    this.updatedAt = new Date();
  }
  
  addCost(amount, type) {
    this.financial.totalCosts += amount;
    this.updatedAt = new Date();
  }
  
  calculateProfitability() {
    return this.financial.totalRevenue - this.financial.totalCosts;
  }
  
  // Availability checking
  isAvailableForDates(startDate, endDate) {
    if (!this.availability.isAvailable) {
      return false;
    }
    
    if (this.status !== 'available') {
      return false;
    }
    
    // Check if car is already booked for these dates
    if (this.currentRental.bookingId && 
        this.currentRental.startDate && 
        this.currentRental.endDate) {
      const rentalStart = new Date(this.currentRental.startDate);
      const rentalEnd = new Date(this.currentRental.endDate);
      const requestStart = new Date(startDate);
      const requestEnd = new Date(endDate);
      
      // Check for overlap
      if (requestStart < rentalEnd && requestEnd > rentalStart) {
        return false;
      }
    }
    
    // Check maintenance schedule
    for (const maintenance of this.maintenance.maintenanceSchedule) {
      const maintStart = new Date(maintenance.startDate);
      const maintEnd = new Date(maintenance.endDate);
      const requestStart = new Date(startDate);
      const requestEnd = new Date(endDate);
      
      if (requestStart < maintEnd && requestEnd > maintStart) {
        return false;
      }
    }
    
    return true;
  }
  
  // Calculate pricing for date range
  calculatePrice(startDate, endDate, options = {}) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    let basePrice = this.pricing.dailyRate * days;
    
    // Apply weekly discount if applicable
    if (days >= 7 && this.pricing.weeklyRate > 0) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      basePrice = (weeks * this.pricing.weeklyRate) + (remainingDays * this.pricing.dailyRate);
    }
    
    // Apply monthly discount if applicable
    if (days >= 30 && this.pricing.monthlyRate > 0) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      basePrice = (months * this.pricing.monthlyRate) + (remainingDays * this.pricing.dailyRate);
    }
    
    // Apply seasonal pricing
    const seasonalMultiplier = this.getSeasonalMultiplier(start, end);
    basePrice *= seasonalMultiplier;
    
    // Add insurance if requested
    if (options.includeInsurance) {
      basePrice += this.pricing.insuranceRate * days;
    }
    
    return {
      basePrice: Math.round(basePrice * 100) / 100,
      currency: this.pricing.currency,
      days,
      dailyRate: this.pricing.dailyRate,
      seasonalMultiplier,
      insurance: options.includeInsurance ? this.pricing.insuranceRate * days : 0
    };
  }
  
  getSeasonalMultiplier(startDate, endDate) {
    // Default multiplier
    let multiplier = 1.0;
    
    // Check if any part of the rental period has seasonal pricing
    for (const seasonal of this.pricing.seasonalPricing) {
      const seasonStart = new Date(seasonal.startDate);
      const seasonEnd = new Date(seasonal.endDate);
      
      if (startDate <= seasonEnd && endDate >= seasonStart) {
        multiplier = Math.max(multiplier, seasonal.multiplier);
      }
    }
    
    return multiplier;
  }
  
  // Transform methods
  toPublicJson() {
    return {
      id: this.id,
      licensePlate: this.licensePlate,
      make: this.make,
      model: this.model,
      year: this.year,
      color: this.color,
      category: this.category,
      transmission: this.transmission,
      fuelType: this.fuelType,
      seatingCapacity: this.seatingCapacity,
      doorCount: this.doorCount,
      luggageCapacity: this.luggageCapacity,
      airConditioning: this.airConditioning,
      features: this.features,
      safetyFeatures: this.safetyFeatures,
      entertainmentFeatures: this.entertainmentFeatures,
      comfortFeatures: this.comfortFeatures,
      currentLocation: {
        city: this.currentLocation.city,
        state: this.currentLocation.state,
        country: this.currentLocation.country
      },
      availability: {
        isAvailable: this.availability.isAvailable,
        nextAvailableDate: this.availability.nextAvailableDate
      },
      pricing: {
        dailyRate: this.pricing.dailyRate,
        weeklyRate: this.pricing.weeklyRate,
        monthlyRate: this.pricing.monthlyRate,
        currency: this.pricing.currency
      },
      condition: {
        overall: this.condition.overall
      },
      images: this.images,
      environmental: this.environmental,
      compliance: this.compliance
    };
  }
  
  toFleetJson() {
    return {
      id: this.id,
      licensePlate: this.licensePlate,
      make: this.make,
      model: this.model,
      year: this.year,
      category: this.category,
      status: this.status,
      availability: this.availability,
      currentLocation: this.currentLocation,
      currentRental: this.currentRental,
      condition: this.condition,
      mileage: this.mileage,
      maintenance: this.maintenance,
      usage: this.usage,
      financial: this.financial,
      tracking: this.tracking,
      updatedAt: this.updatedAt
    };
  }
  
  toAnalyticsJson() {
    return {
      id: this.id,
      category: this.category,
      usage: this.usage,
      financial: {
        totalRevenue: this.financial.totalRevenue,
        totalCosts: this.financial.totalCosts,
        profitability: this.calculateProfitability()
      },
      mileage: this.mileage,
      environmental: this.environmental,
      utilizationRate: this.usage.utilizationRate,
      averageRating: this.usage.customerRatings.length > 0 
        ? this.usage.customerRatings.reduce((sum, rating) => sum + rating.score, 0) / this.usage.customerRatings.length
        : 0
    };
  }
}

module.exports = Car;