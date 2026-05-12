'use client';
import { useState } from 'react';

interface Props {
  date: string;
  periodName: string;
  onClose: () => void;
  onSubmit: (data: { className: string; grade: string; purpose: string; type: string; isCustomTime?: boolean; startTime?: string; endTime?: string }) => Promise<void>;
}

function parseClassInput(value: string): { grade: string; className: string } {
  const match = value.match(/^(\d+)-(.+)$/);
  if (match) return { grade: match[1], className: match[2] };
  return { grade: '', className: value };
}

export default function ReservationModal({ date, periodName, onClose, onSubmit }: Props) {
  const [classInput, setClassInput] = useState('');
  const [purpose, setPurpose] = useState('');
  const [type, setType] = useState('class');
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { grade, className } = parseClassInput(classInput.trim());
    try {
      await onSubmit({ className, grade, purpose, type, isCustomTime, startTime: isCustomTime ? startTime : undefined, endTime: isCustomTime ? endTime : undefined });
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
        <h2 className="text-lg font-bold mb-1">도서관 이용 신청</h2>

        {/* 교시 / 기타 탭 */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-4 mt-3">
          <button
            type="button"
            onClick={() => setIsCustomTime(false)}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${!isCustomTime ? 'bg-white shadow text-[#E8899A] font-medium' : 'text-gray-500'}`}
          >
            수업 교시
          </button>
          <button
            type="button"
            onClick={() => setIsCustomTime(true)}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${isCustomTime ? 'bg-white shadow text-[#E8899A] font-medium' : 'text-gray-500'}`}
          >
            기타 (시간 직접 입력)
          </button>
        </div>

        {!isCustomTime ? (
          <p className="text-sm text-gray-500 mb-4">{date} · {periodName}</p>
        ) : (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">{date}</p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
                required={isCustomTime}
              />
              <span className="text-gray-400">~</span>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
                required={isCustomTime}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            {([
              { value: 'class', label: '수업', bg: 'bg-[#B8E0D2]', active: 'ring-2 ring-[#6bbfa0]' },
              { value: 'event', label: '행사', bg: 'bg-[#C9B8E8]', active: 'ring-2 ring-[#9b82d4]' },
              { value: 'self-study', label: '자율', bg: 'bg-[#F9C4D2]', active: 'ring-2 ring-[#e8899a]' },
            ] as const).map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${t.bg} ${type === t.value ? t.active : 'opacity-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            placeholder="학반 또는 수업명 (예: 3-1, 독서토론반)"
            value={classInput}
            onChange={e => setClassInput(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
            required
          />
          <input
            placeholder="이용 목적"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
            <button type="submit" disabled={loading} className="flex-1 bg-[#E8899A] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#d4758a] disabled:opacity-50">
              {loading ? '처리 중...' : '신청'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
