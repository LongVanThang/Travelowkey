export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Reviews</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">You have not written any reviews yet.</p>
        </div>
      </div>
    </div>
  );
}