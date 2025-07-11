'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { 
  PaperAirplaneIcon, 
  BuildingOfficeIcon, 
  TruckIcon,
  StarIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { formatPrice } from '@/utils/helpers';

export default function HomePage() {
  const [searchType, setSearchType] = useState<'flights' | 'hotels' | 'cars'>('flights');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState(1);

  const featuredDeals = [
    {
      id: 1,
      type: 'flight',
      title: 'New York to London',
      description: 'Round trip from JFK to Heathrow',
      price: 599,
      originalPrice: 899,
      image: '/images/london.jpg',
      airline: 'British Airways',
      duration: '7h 30m',
      rating: 4.5,
    },
    {
      id: 2,
      type: 'hotel',
      title: 'Luxury Resort in Bali',
      description: '5-star beachfront resort with spa',
      price: 299,
      originalPrice: 450,
      image: '/images/bali.jpg',
      location: 'Bali, Indonesia',
      rating: 4.8,
      amenities: ['Pool', 'Spa', 'Beach Access'],
    },
    {
      id: 3,
      type: 'car',
      title: 'SUV Rental in Miami',
      description: 'Premium SUV for your Florida adventure',
      price: 89,
      originalPrice: 120,
      image: '/images/miami-car.jpg',
      carType: 'SUV',
      transmission: 'Automatic',
      seats: 5,
    },
  ];

  const popularDestinations = [
    { name: 'Paris', country: 'France', image: '/images/paris.jpg', price: 450 },
    { name: 'Tokyo', country: 'Japan', image: '/images/tokyo.jpg', price: 780 },
    { name: 'Sydney', country: 'Australia', image: '/images/sydney.jpg', price: 650 },
    { name: 'Dubai', country: 'UAE', image: '/images/dubai.jpg', price: 520 },
    { name: 'Barcelona', country: 'Spain', image: '/images/barcelona.jpg', price: 380 },
    { name: 'Singapore', country: 'Singapore', image: '/images/singapore.jpg', price: 590 },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search logic
    console.log('Search:', { searchType, departure, destination, departureDate, returnDate, travelers });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your Journey Begins Here
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Discover amazing destinations, book flights, hotels, and car rentals all in one place
            </p>
            
            {/* Search Form */}
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-6">
              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  onClick={() => setSearchType('flights')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    searchType === 'flights' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                  <span>Flights</span>
                </button>
                <button
                  onClick={() => setSearchType('hotels')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    searchType === 'hotels' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <BuildingOfficeIcon className="h-5 w-5" />
                  <span>Hotels</span>
                </button>
                <button
                  onClick={() => setSearchType('cars')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    searchType === 'cars' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <TruckIcon className="h-5 w-5" />
                  <span>Cars</span>
                </button>
              </div>

              <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="From"
                    value={departure}
                    onChange={(e) => setDeparture(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="To"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="relative">
                  <UsersIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <select
                    value={travelers}
                    onChange={(e) => setTravelers(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Traveler' : 'Travelers'}
                      </option>
                    ))}
                  </select>
                </div>
              </form>

              <button
                type="submit"
                className="w-full mt-4 bg-blue-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-blue-700 transition-colors"
              >
                Search {searchType.charAt(0).toUpperCase() + searchType.slice(1)}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Deals */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Deals</h2>
            <p className="text-lg text-gray-600">Discover our handpicked offers for your next adventure</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredDeals.map((deal) => (
              <div key={deal.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-48 bg-gray-200 relative">
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                    {Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100)}% OFF
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500 uppercase tracking-wide">
                      {deal.type === 'flight' ? 'Flight' : deal.type === 'hotel' ? 'Hotel' : 'Car Rental'}
                    </span>
                    <div className="flex items-center">
                      <StarIcon className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-gray-600 ml-1">{deal.rating}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{deal.title}</h3>
                  <p className="text-gray-600 mb-4">{deal.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-blue-600">{formatPrice(deal.price)}</span>
                      <span className="text-gray-500 line-through ml-2">{formatPrice(deal.originalPrice)}</span>
                    </div>
                    <Link
                      href={`/${deal.type}/${deal.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      View Deal
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Destinations</h2>
            <p className="text-lg text-gray-600">Explore trending destinations around the world</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularDestinations.map((destination, index) => (
              <div key={index} className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="h-64 bg-gray-200 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-semibold">{destination.name}</h3>
                    <p className="text-sm opacity-90">{destination.country}</p>
                  </div>
                  <div className="absolute top-4 right-4 bg-white/90 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold">
                    From {formatPrice(destination.price)}
                  </div>
                </div>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Link
                    href={`/flights?destination=${destination.name}`}
                    className="bg-white text-gray-900 px-6 py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors flex items-center space-x-2"
                  >
                    <span>Explore</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose TravelowKey?</h2>
            <p className="text-lg text-gray-600">We make travel planning simple and enjoyable</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <PaperAirplaneIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Best Flight Deals</h3>
              <p className="text-gray-600">Find the cheapest flights with our advanced search algorithms</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Premium Hotels</h3>
              <p className="text-gray-600">Book from thousands of hotels worldwide with instant confirmation</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TruckIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Car Rentals</h3>
              <p className="text-gray-600">Rent cars from trusted providers with flexible pickup options</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <StarIcon className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-gray-600">Get help anytime with our round-the-clock customer support</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-xl mb-8 text-blue-100">Join millions of travelers who trust TravelowKey for their adventures</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors"
            >
              Sign Up Now
            </Link>
            <Link
              href="/flights"
              className="border-2 border-white text-white px-8 py-3 rounded-md font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Start Searching
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-blue-400 mb-4">TravelowKey</h3>
              <p className="text-gray-400">Your trusted travel companion for flights, hotels, and car rentals worldwide.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Travel</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/flights" className="hover:text-white transition-colors">Flights</Link></li>
                <li><Link href="/hotels" className="hover:text-white transition-colors">Hotels</Link></li>
                <li><Link href="/cars" className="hover:text-white transition-colors">Car Rentals</Link></li>
                <li><Link href="/deals" className="hover:text-white transition-colors">Deals</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/feedback" className="hover:text-white transition-colors">Feedback</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/press" className="hover:text-white transition-colors">Press</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 TravelowKey. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
