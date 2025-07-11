import { bookingApi } from '@/src/utils/api';
import { useEffect, useState } from 'react';
import { Booking } from '@/src/types/bookings';
import BookingDashboard from '@/src/components/bookings/BookingDashboard';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real user ID from auth context
    const userId = 'me';
    bookingApi.getByUser(userId).then(res => {
      setBookings(res.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
      {loading ? <div>Loading...</div> : <BookingDashboard bookings={bookings} />}
    </div>
  );
}