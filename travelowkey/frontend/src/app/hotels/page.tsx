import { hotelApi } from '@/src/utils/api';
import { useEffect, useState } from 'react';
import { Hotel } from '@/src/types/hotels';
import HotelTable from '@/src/components/hotels/HotelTable';

export default function HotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ city: '', date: '' });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await hotelApi.search(search);
    setHotels(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    hotelApi.search({}).then(res => {
      setHotels(res.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Search Hotels</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input type="text" placeholder="City" value={search.city} onChange={e => setSearch(s => ({ ...s, city: e.target.value }))} className="border p-2 rounded w-1/3" />
        <input type="date" value={search.date} onChange={e => setSearch(s => ({ ...s, date: e.target.value }))} className="border p-2 rounded w-1/3" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Search</button>
      </form>
      {loading ? <div>Loading...</div> : (
        <HotelTable hotels={hotels} />
      )}
    </div>
  );
}