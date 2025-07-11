import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/admin/users" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">User Management</h2>
            <p className="text-gray-600">View, edit, and manage users.</p>
          </Link>
          <Link href="/admin/bookings" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">Bookings</h2>
            <p className="text-gray-600">Manage all bookings and reservations.</p>
          </Link>
          <Link href="/admin/content" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">Content Management</h2>
            <p className="text-gray-600">Edit site content, deals, and banners.</p>
          </Link>
          <Link href="/admin/analytics" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">Analytics</h2>
            <p className="text-gray-600">View site analytics and reports.</p>
          </Link>
          <Link href="/admin/settings" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">Settings</h2>
            <p className="text-gray-600">Configure system settings and preferences.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}