'use client';
import { useState } from 'react';

interface Props {
  date: string;
  periodName: string;
  onClose: () => void;
  onSubmit: (data: { className: string; grade: string; purpose: string; type: string }) => Promise<void>;
}

// "3-1" → { grade: "3", className: "1" }
// "독서토론반" → { grade: "", className: "독서토론반" }
function parseClassInput(value: string): { grade: string; className: string } {
  const match = value.match(/^(\d+)-(.+)$/);
  if (match) return { grade: match[1], className: match[2] };
  return { grade: '', className: value };
}

export default function ReservationModal({ date, periodName, onClose, onSubmit }: Props) {
  const [classInput, setClassInput] = useState('');
  const [purpose, setPurpose] = useState('');
  const [type] = useState('class');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { grade, className } = parseClassInput(classInput.trim());
    try {
      await onSubmit({ className, grade, purpose, type });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '예약 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold mb-1">수업 예약 신청</h2>
        <p className="text-sm text-gray-500 mb-4">{date} · {periodName}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="학반 또는 수업명 (예: 3-1, 독서토론반)"
            value={classInput}
            onChange={e => setClassInput(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
            required
          />
          <input
            placeholder="수업 목적"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
            <button type="submit" disabled={loading} className="flex-1 bg-[#E8899A] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#d4758a] disabled:opacity-50">
              {loading ? '처리 중...' : '예약 신청'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
