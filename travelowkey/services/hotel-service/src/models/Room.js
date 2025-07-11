const { v4: uuidv4 } = require('uuid');

class Room {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.hotelId = data.hotelId;
    this.roomNumber = data.roomNumber;
    this.roomTypeId = data.roomTypeId;
    this.floor = data.floor || 1;
    
    // Physical characteristics
    this.size = data.size || 0; // in square meters
    this.bedConfiguration = {
      bedType: data.bedConfiguration?.bedType || 'double',
      bedCount: data.bedConfiguration?.bedCount || 1,
      sofaBed: data.bedConfiguration?.sofaBed || false,
      rollawayBed: data.bedConfiguration?.rollawayBed || false
    };

    // Room features and amenities
    this.amenities = data.amenities || [];
    this.view = data.view || 'standard'; // city, sea, mountain, garden, pool, courtyard
    this.balcony = data.balcony || false;
    this.smokingAllowed = data.smokingAllowed || false;
    this.accessibility = data.accessibility || [];

    // Status and availability
    this.status = data.status || 'available'; // available, occupied, maintenance, out-of-order
    this.isBlocked = data.isBlocked || false;
    this.blockReason = data.blockReason || '';
    this.maxOccupancy = data.maxOccupancy || 2;

    // Maintenance information
    this.maintenance = {
      isUnderMaintenance: data.maintenance?.isUnderMaintenance || false,
      maintenanceStart: data.maintenance?.maintenanceStart || null,
      maintenanceEnd: data.maintenance?.maintenanceEnd || null,
      reason: data.maintenance?.reason || '',
      priority: data.maintenance?.priority || 'normal'
    };

    // Housekeeping information
    this.housekeeping = {
      lastCleaned: data.housekeeping?.lastCleaned || null,
      cleaningStatus: data.housekeeping?.cleaningStatus || 'clean', // clean, dirty, in-progress
      inspectionStatus: data.housekeeping?.inspectionStatus || 'passed',
      housekeeperAssigned: data.housekeeping?.housekeeperAssigned || null
    };

    // Occupancy history
    this.lastOccupied = data.lastOccupied || null;
    this.currentGuest = data.currentGuest || null;
    this.checkInDate = data.checkInDate || null;
    this.checkOutDate = data.checkOutDate || null;

    // Pricing (room-specific overrides)
    this.priceOverrides = data.priceOverrides || {};
    this.discounts = data.discounts || [];

    // Quality and condition
    this.condition = data.condition || 'good'; // excellent, good, fair, poor
    this.lastRenovated = data.lastRenovated || null;
    this.notes = data.notes || '';

    // Inventory tracking
    this.inventory = {
      minibar: data.inventory?.minibar || {},
      amenityKit: data.inventory?.amenityKit || {},
      linens: data.inventory?.linens || {},
      towels: data.inventory?.towels || {}
    };

    // Energy and environmental
    this.energy = {
      hvacSettings: data.energy?.hvacSettings || {},
      lightingStatus: data.energy?.lightingStatus || {},
      windowStatus: data.energy?.windowStatus || 'closed'
    };

    // Safety and security
    this.safety = {
      safeStatus: data.safety?.safeStatus || 'locked',
      keyCardStatus: data.safety?.keyCardStatus || 'inactive',
      emergencyEquipment: data.safety?.emergencyEquipment || []
    };

    // Technology features
    this.technology = {
      wifi: data.technology?.wifi || true,
      smartTV: data.technology?.smartTV || false,
      climateControl: data.technology?.climateControl || 'manual',
      lighting: data.technology?.lighting || 'manual',
      curtains: data.technology?.curtains || 'manual'
    };

    // Timestamps
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Validation methods
  validate() {
    const errors = [];

    if (!this.hotelId) {
      errors.push('Hotel ID is required');
    }

    if (!this.roomNumber) {
      errors.push('Room number is required');
    }

    if (!this.roomTypeId) {
      errors.push('Room type ID is required');
    }

    if (this.floor < 0) {
      errors.push('Floor must be a positive number');
    }

    if (this.maxOccupancy < 1) {
      errors.push('Max occupancy must be at least 1');
    }

    if (!['available', 'occupied', 'maintenance', 'out-of-order'].includes(this.status)) {
      errors.push('Invalid room status');
    }

    return errors;
  }

  // Status management methods
  setAvailable() {
    this.status = 'available';
    this.isBlocked = false;
    this.blockReason = '';
    this.currentGuest = null;
    this.checkInDate = null;
    this.checkOutDate = null;
    this.updatedAt = new Date();
  }

  setOccupied(guestInfo, checkIn, checkOut) {
    this.status = 'occupied';
    this.currentGuest = guestInfo;
    this.checkInDate = checkIn;
    this.checkOutDate = checkOut;
    this.lastOccupied = checkIn;
    this.updatedAt = new Date();
  }

  setMaintenance(reason, startDate, endDate, priority = 'normal') {
    this.status = 'maintenance';
    this.maintenance.isUnderMaintenance = true;
    this.maintenance.reason = reason;
    this.maintenance.maintenanceStart = startDate;
    this.maintenance.maintenanceEnd = endDate;
    this.maintenance.priority = priority;
    this.updatedAt = new Date();
  }

  completeMaintenance() {
    this.status = 'available';
    this.maintenance.isUnderMaintenance = false;
    this.maintenance.maintenanceEnd = new Date();
    this.updatedAt = new Date();
  }

  setOutOfOrder(reason) {
    this.status = 'out-of-order';
    this.isBlocked = true;
    this.blockReason = reason;
    this.updatedAt = new Date();
  }

  block(reason) {
    this.isBlocked = true;
    this.blockReason = reason;
    this.updatedAt = new Date();
  }

  unblock() {
    this.isBlocked = false;
    this.blockReason = '';
    this.updatedAt = new Date();
  }

  // Housekeeping methods
  setCleaning(housekeeperAssigned = null) {
    this.housekeeping.cleaningStatus = 'in-progress';
    this.housekeeping.housekeeperAssigned = housekeeperAssigned;
    this.updatedAt = new Date();
  }

  completecleaning() {
    this.housekeeping.cleaningStatus = 'clean';
    this.housekeeping.lastCleaned = new Date();
    this.housekeeping.inspectionStatus = 'pending';
    this.updatedAt = new Date();
  }

  inspect(passed = true) {
    this.housekeeping.inspectionStatus = passed ? 'passed' : 'failed';
    if (!passed) {
      this.housekeeping.cleaningStatus = 'dirty';
    }
    this.updatedAt = new Date();
  }

  // Availability checking
  isAvailableForBooking() {
    return this.status === 'available' && 
           !this.isBlocked && 
           !this.maintenance.isUnderMaintenance &&
           this.housekeeping.cleaningStatus === 'clean' &&
           this.housekeeping.inspectionStatus === 'passed';
  }

  isAvailableForDate(date) {
    if (!this.isAvailableForBooking()) {
      return false;
    }

    // Check if date falls within maintenance period
    if (this.maintenance.isUnderMaintenance) {
      const maintenanceStart = new Date(this.maintenance.maintenanceStart);
      const maintenanceEnd = new Date(this.maintenance.maintenanceEnd);
      const checkDate = new Date(date);
      
      if (checkDate >= maintenanceStart && checkDate <= maintenanceEnd) {
        return false;
      }
    }

    // Check if room is occupied on this date
    if (this.status === 'occupied' && this.checkInDate && this.checkOutDate) {
      const checkIn = new Date(this.checkInDate);
      const checkOut = new Date(this.checkOutDate);
      const checkDate = new Date(date);
      
      if (checkDate >= checkIn && checkDate < checkOut) {
        return false;
      }
    }

    return true;
  }

  // Transform methods
  toElasticsearchDocument() {
    return {
      id: this.id,
      hotelId: this.hotelId,
      roomNumber: this.roomNumber,
      roomTypeId: this.roomTypeId,
      floor: this.floor,
      status: this.status,
      availability: this.generateAvailabilityArray(), // Generate for next 365 days
      maintenance: this.maintenance,
      lastCleaned: this.housekeeping.lastCleaned,
      lastOccupied: this.lastOccupied,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toPublicJson() {
    return {
      id: this.id,
      roomNumber: this.roomNumber,
      roomTypeId: this.roomTypeId,
      floor: this.floor,
      size: this.size,
      bedConfiguration: this.bedConfiguration,
      amenities: this.amenities,
      view: this.view,
      balcony: this.balcony,
      smokingAllowed: this.smokingAllowed,
      accessibility: this.accessibility,
      maxOccupancy: this.maxOccupancy,
      condition: this.condition,
      technology: this.technology
    };
  }

  toInventoryJson() {
    return {
      id: this.id,
      roomNumber: this.roomNumber,
      roomTypeId: this.roomTypeId,
      status: this.status,
      isBlocked: this.isBlocked,
      blockReason: this.blockReason,
      maintenance: this.maintenance,
      housekeeping: this.housekeeping,
      currentGuest: this.currentGuest,
      checkInDate: this.checkInDate,
      checkOutDate: this.checkOutDate,
      lastOccupied: this.lastOccupied
    };
  }

  // Generate availability array for Elasticsearch
  generateAvailabilityArray(days = 365) {
    const availability = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      availability.push({
        date: date.toISOString().split('T')[0],
        isAvailable: this.isAvailableForDate(date),
        price: this.calculatePriceForDate(date),
        restrictions: this.getRestrictionsForDate(date)
      });
    }
    
    return availability;
  }

  calculatePriceForDate(date) {
    // Base price calculation - would typically integrate with pricing service
    const basePrice = 100; // This would come from room type
    const dateStr = date.toISOString().split('T')[0];
    
    // Apply any date-specific overrides
    if (this.priceOverrides[dateStr]) {
      return this.priceOverrides[dateStr];
    }
    
    // Apply discounts
    let finalPrice = basePrice;
    this.discounts.forEach(discount => {
      if (discount.validFrom <= date && discount.validTo >= date) {
        finalPrice *= (1 - discount.percentage / 100);
      }
    });
    
    return Math.round(finalPrice * 100) / 100;
  }

  getRestrictionsForDate(date) {
    const restrictions = [];
    
    if (this.maintenance.isUnderMaintenance) {
      const maintenanceStart = new Date(this.maintenance.maintenanceStart);
      const maintenanceEnd = new Date(this.maintenance.maintenanceEnd);
      
      if (date >= maintenanceStart && date <= maintenanceEnd) {
        restrictions.push('under_maintenance');
      }
    }
    
    if (this.isBlocked) {
      restrictions.push('blocked');
    }
    
    return restrictions.join(',');
  }

  static fromElasticsearchDocument(doc) {
    return new Room(doc._source || doc);
  }
}

module.exports = Room;