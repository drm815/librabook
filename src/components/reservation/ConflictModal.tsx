'use client';
import { useState } from 'react';

interface ConflictInfo {
  id: string;
  teacherId: string;
  className: string;
  grade: string;
  type: string;
}

interface Props {
  conflict: ConflictInfo;
  onClose: () => void;
  onNegotiationComplete: (reservationData: { className: string; grade: string; purpose: string }) => Promise<void>;
}

export default function ConflictModal({ conflict, onClose, onNegotiationComplete }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setLoading(true);
    await onNegotiationComplete({ className, grade, purpose });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-amber-800">이미 예약된 시간입니다</p>
          <p className="text-xs text-amber-600 mt-1">
            기존 예약: {conflict.grade}학년 {conflict.className}반
            ({conflict.type === 'class' ? '수업' : '행사'})
          </p>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          기존 예약자와 협의 후, 협의 완료 시 아래에 체크하고 예약을 신청하세요.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input placeholder="학년" value={grade} onChange={e => setGrade(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]" required />
            <input placeholder="반" value={className} onChange={e => setClassName(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]" required />
          </div>
          <input placeholder="수업 목적" value={purpose} onChange={e => setPurpose(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]" required />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="accent-[#E8899A]" />
            기존 예약자와 협의를 완료했습니다
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">취소</button>
            <button type="submit" disabled={!agreed || loading} className="flex-1 bg-[#E8899A] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {loading ? '처리 중...' : '예약 신청'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
