import { flightApi } from '@/src/utils/api';
import { useEffect, useState } from 'react';
import { Flight } from '@/src/types/flights';
import FlightCard from '@/src/components/flights/FlightCard';

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ from: '', to: '', date: '' });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await flightApi.search(search);
    setFlights(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    flightApi.search({}).then(res => {
      setFlights(res.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Search Flights</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input type="text" placeholder="From" value={search.from} onChange={e => setSearch(s => ({ ...s, from: e.target.value }))} className="border p-2 rounded w-1/4" />
        <input type="text" placeholder="To" value={search.to} onChange={e => setSearch(s => ({ ...s, to: e.target.value }))} className="border p-2 rounded w-1/4" />
        <input type="date" value={search.date} onChange={e => setSearch(s => ({ ...s, date: e.target.value }))} className="border p-2 rounded w-1/4" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Search</button>
      </form>
      {loading ? <div>Loading...</div> : (
        <div className="grid gap-4">
          {flights.map(flight => (
            <FlightCard key={flight.id} flight={flight} />
          ))}
        </div>
      )}
    </div>
  );
}