'use client';
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import TimetableSettings from '@/components/admin/TimetableSettings';
import CalendarGrid from '@/components/timetable/CalendarGrid';
import ReservationModal from '@/components/reservation/ReservationModal';
import ReservationDetailModal from '@/components/reservation/ReservationDetailModal';
import ConflictModal from '@/components/reservation/ConflictModal';
import BulkReservationModal from '@/components/reservation/BulkReservationModal';
import { useTimetable } from '@/hooks/useTimetable';
import { useAuth } from '@/hooks/useAuth';
import type { Reservation } from '@/types';

export default function AdminTimetablePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = format(currentDate, 'yyyy-MM');
  const { days, periods, loading, getReservation, reload } = useTimetable(month);
  const { user } = useAuth();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ date: string; periodId: string; periodName: string; isCustom?: boolean } | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<{ reservation: Reservation; periodName: string } | null>(null);
  const [conflict, setConflict] = useState<{ info: Reservation; date: string; periodId: string } | null>(null);

  function handleCellClick(date: string, periodId: string, existing?: Reservation) {
    const period = periods.find(p => p.id === periodId);
    if (existing) {
      setSelectedReservation({ reservation: existing, periodName: period?.name ?? '' });
      return;
    }
    setSelectedCell({ date, periodId, periodName: period?.name ?? '' });
  }

  async function handleReserve(data: { className: string; grade: string; purpose: string; type: string; isCustomTime?: boolean; startTime?: string; endTime?: string }) {
    if (!selectedCell) return;
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        date: selectedCell.date,
        periodId: data.isCustomTime ? undefined : selectedCell.periodId,
      }),
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

  async function handleCancel(id: string) {
    await fetch(`/api/reservations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    reload?.();
  }

  async function handleEdit(id: string, data: { className: string; grade: string; purpose: string; type: string }) {
    await fetch(`/api/reservations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    reload?.();
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
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      {/* 예약 현황 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-1.5 rounded-lg hover:bg-gray-100">◀</button>
            <h2 className="text-lg font-bold">{format(currentDate, 'yyyy년 M월')} 예약 현황</h2>
            <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-1.5 rounded-lg hover:bg-gray-100">▶</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-[#B8E0D2] rounded">수업</span>
              <span className="px-2 py-1 bg-[#C9B8E8] rounded">행사</span>
              <span className="px-2 py-1 bg-[#F9C4D2] rounded">자율</span>
            </div>
            <button
              onClick={() => setBulkOpen(true)}
              className="px-3 py-1.5 bg-[#E8899A] text-white text-xs font-medium rounded-lg hover:bg-[#d4758a] transition-colors"
            >
              반복 예약
            </button>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-10 text-gray-400">불러오는 중...</div>
        ) : (
          <CalendarGrid days={days} periods={periods} getReservation={getReservation} onCellClick={handleCellClick} onCustomClick={date => setSelectedCell({ date, periodId: '', periodName: '', isCustom: true })} userRole="admin" />
        )}
      </div>

      {/* 타임테이블 설정 - 접기/펼치기 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setSettingsOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-500">타임테이블 설정 (월 생성 · 교시 관리)</span>
          <span className="text-gray-400 text-xs">{settingsOpen ? '▲ 접기' : '▼ 펼치기'}</span>
        </button>
        {settingsOpen && (
          <div className="px-6 pb-6 border-t border-gray-50">
            <div className="pt-6">
              <TimetableSettings />
            </div>
          </div>
        )}
      </div>

      {selectedCell && (
        <ReservationModal date={selectedCell.date} periodName={selectedCell.periodName} defaultCustomTime={selectedCell.isCustom} onClose={() => setSelectedCell(null)} onSubmit={handleReserve} />
      )}
      {selectedReservation && user && (
        <ReservationDetailModal
          reservation={selectedReservation.reservation}
          periodName={selectedReservation.periodName}
          isOwner={selectedReservation.reservation.teacherId === user.id}
          isAdmin={user.role === 'admin'}
          onClose={() => setSelectedReservation(null)}
          onCancel={handleCancel}
          onEdit={handleEdit}
        />
      )}
      {conflict && (
        <ConflictModal conflict={conflict.info} onClose={() => setConflict(null)} onNegotiationComplete={handleConflictResolve} />
      )}
      {bulkOpen && (
        <BulkReservationModal
          days={days}
          periods={periods}
          onClose={() => setBulkOpen(false)}
          onSuccess={() => reload?.()}
        />
      )}
    </div>
  );
}
