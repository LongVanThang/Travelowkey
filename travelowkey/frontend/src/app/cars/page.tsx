import { carApi } from '@/src/utils/api';
import { useEffect, useState } from 'react';
import { Car } from '@/src/types/cars';
import CarList from '@/src/components/cars/CarList';

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carApi.search({}).then(res => {
      setCars(res.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Car Rentals</h1>
      {loading ? <div>Loading...</div> : <CarList cars={cars} />}
    </div>
  );
}