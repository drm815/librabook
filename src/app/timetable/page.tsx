'use client';
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import ReservationModal from '@/components/reservation/ReservationModal';
import ConflictModal from '@/components/reservation/ConflictModal';
import { useTimetable } from '@/hooks/useTimetable';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import type { Reservation } from '@/types';

export default function TimetablePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = format(currentDate, 'yyyy-MM');
  const { days, periods, loading, getReservation, reload } = useTimetable(month);
  const { user, logout } = useAuth();
  const router = useRouter();

  const [selectedCell, setSelectedCell] = useState<{ date: string; periodId: string; periodName: string } | null>(null);
  const [conflict, setConflict] = useState<{ info: Reservation; date: string; periodId: string } | null>(null);

  async function handleCellClick(date: string, periodId: string, existing?: Reservation) {
    if (!user || user.role === 'student') return;
    const period = periods.find(p => p.id === periodId);
    if (existing) return;
    setSelectedCell({ date, periodId, periodName: period?.name ?? '' });
  }

  async function handleReserve(data: { className: string; grade: string; purpose: string; type: string }) {
    if (!selectedCell) return;
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, date: selectedCell.date, periodId: selectedCell.periodId }),
    });
    if (res.status === 409) {
      const { existing } = await res.json();
      setSelectedCell(null);
      setConflict({ info: existing, date: selectedCell.date, periodId: selectedCell.periodId });
      return;
    }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    reload?.();
    setSelectedCell(null);
  }

  async function handleConflictResolve(data: { className: string; grade: string; purpose: string }) {
    if (!conflict) return;
    await fetch(`/api/reservations/${conflict.info.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, type: 'class', date: conflict.date, periodId: conflict.periodId }),
    });
    reload?.();
    setConflict(null);
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0]">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#333]">LibraBook</h1>
        <div className="flex items-center gap-4">
          {user && <span className="text-sm text-gray-600">{user.name} ({user.role === 'teacher' ? '선생님' : user.role === 'student' ? '학생' : '관리자'})</span>}
          <button onClick={async () => { await logout(); router.push('/login'); }} className="text-sm text-gray-500 hover:text-red-500 transition-colors">로그아웃</button>
        </div>
      </header>
      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-2 rounded-lg hover:bg-gray-100">◀</button>
            <h2 className="text-xl font-bold">{format(currentDate, 'yyyy년 M월')}</h2>
            <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-2 rounded-lg hover:bg-gray-100">▶</button>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-[#B8E0D2] rounded">수업</span>
            <span className="px-2 py-1 bg-[#C9B8E8] rounded">행사</span>
            <span className="px-2 py-1 bg-[#F9C4D2] rounded">자율</span>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-10 text-gray-400">불러오는 중...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <TimetableGrid days={days} periods={periods} getReservation={getReservation} onCellClick={handleCellClick} userRole={user?.role} />
          </div>
        )}
      </main>
      {selectedCell && (
        <ReservationModal date={selectedCell.date} periodName={selectedCell.periodName} onClose={() => setSelectedCell(null)} onSubmit={handleReserve} />
      )}
      {conflict && (
        <ConflictModal conflict={conflict.info as ConflictInfo} onClose={() => setConflict(null)} onNegotiationComplete={handleConflictResolve} />
      )}
    </div>
  );
}

interface ConflictInfo {
  id: string;
  teacherId: string;
  className: string;
  grade: string;
  type: string;
}
