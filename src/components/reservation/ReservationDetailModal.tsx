'use client';
import { useState } from 'react';
import type { Reservation } from '@/types';

interface Props {
  reservation: Reservation;
  periodName: string;
  isOwner: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onCancel: (id: string) => Promise<void>;
  onEdit: (id: string, data: { className: string; grade: string; purpose: string; type: string }) => Promise<void>;
}

const TYPE_LABELS: Record<string, string> = { class: '수업', event: '행사', 'self-study': '자율' };
const TYPE_COLORS: Record<string, string> = {
  class: 'bg-[#B8E0D2] text-[#2a7a5a]',
  event: 'bg-[#C9B8E8] text-[#6b3fa0]',
  'self-study': 'bg-[#F9C4D2] text-[#c0566a]',
};

function parseClassInput(value: string): { grade: string; className: string } {
  const match = value.match(/^(\d+)-(.+)$/);
  if (match) return { grade: match[1], className: match[2] };
  return { grade: '', className: value };
}

export default function ReservationDetailModal({ reservation, periodName, isOwner, isAdmin, onClose, onCancel, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [classInput, setClassInput] = useState(
    reservation.grade ? `${reservation.grade}-${reservation.className}` : reservation.className
  );
  const [purpose, setPurpose] = useState(reservation.purpose);
  const [type, setType] = useState(reservation.type);
  const [loading, setLoading] = useState(false);

  const canEdit = isOwner || isAdmin;

  async function handleCancel() {
    if (!confirm('예약을 취소하시겠습니까?')) return;
    setLoading(true);
    await onCancel(reservation.id);
    setLoading(false);
    onClose();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { grade, className } = parseClassInput(classInput.trim());
    await onEdit(reservation.id, { className, grade, purpose, type });
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        {!editing ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">예약 정보</h2>
                <p className="text-sm text-gray-500">{reservation.date} · {periodName}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${TYPE_COLORS[reservation.type] ?? 'bg-gray-100'}`}>
                {TYPE_LABELS[reservation.type] ?? reservation.type}
              </span>
            </div>

            <div className="space-y-2 mb-6 text-sm">
              {reservation.teacherName && (
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">예약자</span>
                  <span className="font-medium">{reservation.teacherName} 선생님</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">학반/수업명</span>
                <span className="font-medium">
                  {reservation.grade ? `${reservation.grade}-${reservation.className}` : reservation.className}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">목적</span>
                <span className="font-medium">{reservation.purpose}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                닫기
              </button>
              {canEdit && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex-1 border border-[#E8899A] text-[#E8899A] rounded-lg py-2 text-sm font-medium hover:bg-[#fff0f3]"
                  >
                    수정
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 bg-red-50 text-red-400 rounded-lg py-2 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                  >
                    취소
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-1">예약 수정</h2>
            <p className="text-sm text-gray-500 mb-4">{reservation.date} · {periodName}</p>
            <form onSubmit={handleEdit} className="space-y-3">
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
                value={classInput}
                onChange={e => setClassInput(e.target.value)}
                placeholder="학반 또는 수업명 (예: 3-1, 독서토론반)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
                required
              />
              <input
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="수업 목적"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
                required
              />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditing(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">
                  뒤로
                </button>
                <button type="submit" disabled={loading} className="flex-1 bg-[#E8899A] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                  {loading ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
