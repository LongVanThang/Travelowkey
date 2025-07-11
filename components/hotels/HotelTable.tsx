import React from 'react';
import { Hotel } from '../../types/index';

interface HotelTableProps {
  hotels: Hotel[];
  onEdit?: (hotel: Hotel) => void;
  onDelete?: (hotelId: string) => void;
}

export default function HotelTable({ hotels, onEdit, onDelete }: HotelTableProps) {
  return (
    <table className="min-w-full bg-white rounded-lg shadow overflow-hidden">
      <thead>
        <tr>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
        </tr>
      </thead>
      <tbody>
        {hotels.map((hotel) => (
          <tr key={hotel.id} className="border-t">
            <td className="px-4 py-2 font-semibold text-gray-900">{hotel.name}</td>
            <td className="px-4 py-2 text-gray-700">{hotel.address.city}, {hotel.address.country}</td>
            <td className="px-4 py-2 text-yellow-600 font-bold">{hotel.rating}</td>
            <td className="px-4 py-2">
              {onEdit && (
                <button className="text-blue-600 hover:underline text-sm mr-2" onClick={() => onEdit(hotel)}>Edit</button>
              )}
              {onDelete && (
                <button className="text-red-600 hover:underline text-sm" onClick={() => onDelete(hotel.id)}>Delete</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}