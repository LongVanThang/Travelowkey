export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  preferredAirlines?: string[];
  preferredHotels?: string[];
  preferredCarRentals?: string[];
  seatPreference?: 'window' | 'aisle' | 'middle';
  mealPreference?: 'vegetarian' | 'non-vegetarian' | 'vegan';
  roomPreference?: 'single' | 'double' | 'suite';
}

export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: number; // in minutes
  price: number;
  availableSeats: number;
  aircraft: string;
  stops: number;
  cabinClass: 'economy' | 'business' | 'first';
  refundable: boolean;
  changeable: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  rating: number;
  amenities: string[];
  roomTypes: RoomType[];
  images: string[];
  location: {
    latitude: number;
    longitude: number;
  };
  contact: {
    phone: string;
    email: string;
  };
}

export interface RoomType {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price: number;
  availableRooms: number;
  amenities: string[];
  images: string[];
}

export interface Car {
  id: string;
  model: string;
  brand: string;
  year: number;
  type: 'economy' | 'compact' | 'midsize' | 'fullsize' | 'luxury' | 'suv' | 'minivan';
  transmission: 'automatic' | 'manual';
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  seats: number;
  price: number;
  available: boolean;
  location: string;
  images: string[];
  features: string[];
}

export interface Booking {
  id: string;
  userId: string;
  type: 'flight' | 'hotel' | 'car' | 'package';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  items: BookingItem[];
  totalAmount: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
  travelDate: string;
  returnDate?: string;
}

export interface BookingItem {
  id: string;
  type: 'flight' | 'hotel' | 'car';
  itemId: string;
  quantity: number;
  price: number;
  details: Flight | Hotel | Car;
}

export interface SearchFilters {
  priceRange?: {
    min: number;
    max: number;
  };
  airlines?: string[];
  hotels?: string[];
  carTypes?: string[];
  rating?: number;
  amenities?: string[];
  location?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams {
  query: string;
  filters?: SearchFilters;
  pagination?: PaginationParams;
}