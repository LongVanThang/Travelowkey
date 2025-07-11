import { notificationApi } from '@/src/utils/api';
import { useEffect, useState } from 'react';
import { NotificationSettings } from '@/src/types/notifications';
import NotificationSettingsForm from '@/src/components/notifications/NotificationSettingsForm';

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real user ID from auth context
    const userId = 'me';
    notificationApi.getSettings(userId).then(res => {
      setSettings(res.data || null);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Notification Settings</h1>
      {loading ? <div>Loading...</div> : <NotificationSettingsForm settings={settings} />}
    </div>
  );
}