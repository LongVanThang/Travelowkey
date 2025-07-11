import { adminApi } from '@/src/utils/api';
import { useEffect, useState } from 'react';
import AdminDashboard from '@/src/components/admin/AdminDashboard';
import AnalyticsDashboard from '@/src/components/admin/AnalyticsDashboard';

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getDashboard(),
      adminApi.getAnalytics()
    ]).then(([dashboardRes, analyticsRes]) => {
      setDashboard(dashboardRes.data);
      setAnalytics(analyticsRes.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      {loading ? <div>Loading...</div> : (
        <>
          <AdminDashboard data={dashboard} />
          <AnalyticsDashboard data={analytics} />
        </>
      )}
    </div>
  );
}