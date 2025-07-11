import { reviewApi } from '@/src/utils/api';
import { useEffect, useState } from 'react';
import { Review } from '@/src/types/reviews';
import ReviewList from '@/src/components/reviews/ReviewList';
import ReviewForm from '@/src/components/reviews/ReviewForm';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real user ID from auth context
    const userId = 'me';
    reviewApi.getByUser(userId).then(res => {
      setReviews(res.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">My Reviews</h1>
      <ReviewForm onSubmit={() => {}} />
      {loading ? <div>Loading...</div> : <ReviewList reviews={reviews} />}
    </div>
  );
}