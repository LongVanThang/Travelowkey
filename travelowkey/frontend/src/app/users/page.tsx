import { userApi } from '@/src/utils/api';
import { useEffect, useState } from 'react';
import { UserProfile, LoyaltyPoints } from '@/src/types/user';

export default function UsersPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyPoints | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const profileRes = await userApi.getProfile();
      const loyaltyRes = await userApi.getLoyaltyPoints();
      setProfile(profileRes.data || null);
      setLoyalty(loyaltyRes.data || null);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      {profile && (
        <div className="bg-white rounded shadow p-4 mb-6">
          <div><b>Name:</b> {profile.name}</div>
          <div><b>Email:</b> {profile.email}</div>
          <div><b>Preferences:</b> {profile.preferences?.join(', ')}</div>
          {/* TODO: Add edit profile form/modal */}
        </div>
      )}
      <h2 className="text-xl font-semibold mb-2">Loyalty Points</h2>
      {loyalty && (
        <div className="bg-blue-50 rounded shadow p-4">
          <div><b>Points:</b> {loyalty.points}</div>
          <div><b>Status:</b> {loyalty.status}</div>
        </div>
      )}
    </div>
  );
}