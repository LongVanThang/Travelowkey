import { paymentApi } from '@/src/utils/api';
import { useEffect, useState } from 'react';
import { Payment } from '@/src/types/payments';
import PaymentHistory from '@/src/components/payments/PaymentHistory';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real user ID from auth context
    const userId = 'me';
    paymentApi.getPaymentHistory(userId).then(res => {
      setPayments(res.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Payment History</h1>
      {loading ? <div>Loading...</div> : <PaymentHistory payments={payments} />}
    </div>
  );
}