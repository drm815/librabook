'use client';
import { useState, useEffect } from 'react';
import type { Notification } from '@/types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  async function fetchNotifications() {
    const res = await fetch('/api/notifications');
    if (res.ok) setNotifications(await res.json());
  }

  useEffect(() => {
    fetchNotifications();
    // 30초마다 폴링 (Google Sheets API 제한 고려)
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  async function markAsRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }

  return { notifications, unreadCount, markAsRead, refetch: fetchNotifications };
}
