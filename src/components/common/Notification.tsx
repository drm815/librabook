'use client';
import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const TYPE_LABELS: Record<string, string> = { reserved: '예약 완료', conflict: '충돌 발생', negotiation_complete: '협의 완료' };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-lg hover:bg-gray-100">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#E8899A] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 font-medium text-sm">알림</div>
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-gray-400 text-center">알림이 없습니다</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 hover:bg-gray-50 ${!n.isRead ? 'bg-[#FDF6F0]' : ''}`}
                >
                  <div className="font-medium text-xs text-[#E8899A] mb-0.5">{TYPE_LABELS[n.type]}</div>
                  <div className="text-gray-700">{n.message}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('ko-KR')}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
