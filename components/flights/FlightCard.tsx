import React from 'react';
import { Flight } from '../../types/index';

interface FlightCardProps {
  flight: Flight;
  onEdit?: (flight: Flight) => void;
  onDelete?: (flightId: string) => void;
}

export default function FlightCard({ flight, onEdit, onDelete }: FlightCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-lg font-bold text-blue-700">{flight.airline} {flight.flightNumber}</div>
          <div className="text-sm text-gray-500">{flight.departureAirport} → {flight.arrivalAirport}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-blue-600">${flight.price}</div>
          <div className="text-xs text-gray-400">{flight.cabinClass}</div>
        </div>
      </div>
      <div className="flex justify-between text-sm text-gray-600">
        <span>Departs: {new Date(flight.departureTime).toLocaleString()}</span>
        <span>Arrives: {new Date(flight.arrivalTime).toLocaleString()}</span>
      </div>
      <div className="flex gap-2 mt-2">
        {onEdit && (
          <button className="text-blue-600 hover:underline text-sm" onClick={() => onEdit(flight)}>Edit</button>
        )}
        {onDelete && (
          <button className="text-red-600 hover:underline text-sm" onClick={() => onDelete(flight.id)}>Delete</button>
        )}
      </div>
    </div>
  );
}