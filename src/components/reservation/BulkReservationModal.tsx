'use client';
import { useState } from 'react';
import type { Period, TimetableDay } from '@/types';

interface Props {
  days: TimetableDay[];
  periods: Period[];
  onClose: () => void;
  onSuccess: () => void;
}

const DAYS_KOR = ['월', '화', '수', '목', '금'];

function parseClassInput(value: string): { grade: string; className: string } {
  const match = value.match(/^(\d+)-(.+)$/);
  if (match) return { grade: match[1], className: match[2] };
  return { grade: '', className: value };
}

export default function BulkReservationModal({ days, periods, onClose, onSuccess }: Props) {
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set());
  const [classInput, setClassInput] = useState('');
  const [purpose, setPurpose] = useState('');
  const [type, setType] = useState('class');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState('');

  function toggleDay(day: string) {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  }

  function togglePeriod(id: string) {
    setSelectedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // 선택된 요일에 해당하는 날짜만 추출 (휴일 제외)
  const targetDates = days
    .filter(d => !d.isHoliday && selectedDays.has(d.dayOfWeek))
    .map(d => d.date);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedDays.size === 0 || selectedPeriods.size === 0) {
      setError('요일과 교시를 선택해주세요');
      return;
    }
    setLoading(true);
    setError('');
    const { grade, className } = parseClassInput(classInput.trim());
    const res = await fetch('/api/reservations/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dates: targetDates,
        periodIds: Array.from(selectedPeriods),
        type,
        className,
        grade,
        purpose,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? '오류가 발생했습니다');
    } else {
      setResult({ inserted: data.inserted, skipped: data.skipped });
      onSuccess();
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
        <h2 className="text-lg font-bold mb-1">반복 예약 일괄 등록</h2>
        <p className="text-sm text-gray-400 mb-4">이번 달 특정 요일·교시에 반복되는 수업을 한 번에 등록합니다</p>

        {result ? (
          <div className="text-center py-6">
            <p className="text-2xl font-bold text-[#E8899A] mb-2">{result.inserted}건 등록 완료</p>
            {result.skipped > 0 && (
              <p className="text-sm text-gray-400">{result.skipped}건은 이미 예약되어 있어 건너뛰었습니다</p>
            )}
            <button onClick={onClose} className="mt-6 bg-[#E8899A] text-white px-6 py-2 rounded-lg text-sm font-medium">
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 유형 */}
            <div className="flex gap-2">
              {([
                { value: 'class', label: '수업', bg: 'bg-[#B8E0D2]', active: 'ring-2 ring-[#6bbfa0]' },
                { value: 'event', label: '행사', bg: 'bg-[#C9B8E8]', active: 'ring-2 ring-[#9b82d4]' },
                { value: 'self-study', label: '자율', bg: 'bg-[#F9C4D2]', active: 'ring-2 ring-[#e8899a]' },
              ] as const).map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${t.bg} ${type === t.value ? t.active : 'opacity-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* 요일 선택 */}
            <div>
              <p className="text-xs text-gray-400 mb-2">요일 선택</p>
              <div className="flex gap-2">
                {DAYS_KOR.map(day => (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      selectedDays.has(day)
                        ? 'bg-[#E8899A] text-white border-[#E8899A]'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {day}
                  </button>
                ))}
              </div>
              {selectedDays.size > 0 && (
                <p className="text-xs text-gray-400 mt-1">{targetDates.length}개 날짜 해당</p>
              )}
            </div>

            {/* 교시 선택 */}
            <div>
              <p className="text-xs text-gray-400 mb-2">교시 선택 (복수 선택 가능)</p>
              <div className="flex flex-wrap gap-2">
                {periods.map(p => (
                  <button key={p.id} type="button" onClick={() => togglePeriod(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      selectedPeriods.has(p.id)
                        ? 'bg-[#E8899A] text-white border-[#E8899A]'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 학반/수업명 */}
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

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                취소
              </button>
              <button type="submit" disabled={loading || targetDates.length === 0 || selectedPeriods.size === 0}
                className="flex-1 bg-[#E8899A] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {loading ? '등록 중...' : `${targetDates.length * selectedPeriods.size}건 일괄 등록`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
