'use client';
import { useState, useEffect } from 'react';
import type { LibraryActivity } from '@/types';

interface Props {
  userName: string;
}

export default function LibraryActivityTab({ userName }: Props) {
  const [activities, setActivities] = useState<LibraryActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/library-activities');
    const data = await res.json();
    setActivities(data);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    const res = await fetch('/api/library-activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, content }),
    });
    if (res.ok) {
      setContent('');
      setMessage('기록 완료!');
      await load();
      setTimeout(() => setMessage(''), 2000);
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/library-activities/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* 환영 배너 */}
      <div className="bg-gradient-to-r from-[#E8899A] to-[#C9B8E8] rounded-2xl p-5 mb-6 text-white text-center shadow-sm">
        <p className="text-2xl mb-1">📚</p>
        <p className="font-bold text-lg">{userName}님, 도서부네요?</p>
        <p className="text-sm opacity-90 mt-1">오늘도 수고 많았어요, 화이팅!! 🎉</p>
      </div>

      {/* 입력 폼 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <h3 className="font-bold text-gray-700 mb-4">활동 기록하기</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">날짜</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">활동 내용</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="오늘 어떤 활동을 했나요? (도서 반납 처리, 서가 정리, 북 큐레이션 등)"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A] resize-none"
            />
          </div>
          {message && (
            <p className="text-xs text-green-600 font-medium">{message}</p>
          )}
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="w-full bg-[#E8899A] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {submitting ? '저장 중...' : '기록 저장'}
          </button>
        </form>
      </div>

      {/* 활동 목록 */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-700 mb-4">내 활동 기록</h3>
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-6">불러오는 중...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">아직 기록이 없어요. 첫 활동을 기록해 보세요!</p>
        ) : (
          <ul className="space-y-3">
            {activities.map(a => (
              <li key={a.id} className="border border-gray-100 rounded-xl p-3 flex justify-between items-start gap-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">{a.date}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.content}</p>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-xs text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
