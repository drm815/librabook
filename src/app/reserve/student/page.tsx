'use client';
import { useState, useEffect } from 'react';
import SeatMap from '@/components/reservation/SeatMap';
import { useAuth } from '@/hooks/useAuth';
import { isStudentReservationAllowed, getCurrentKSTDate } from '@/lib/utils';
import type { Seat } from '@/types';

export default function StudentReservePage() {
  const { user } = useAuth();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [reservedSeats, setReservedSeats] = useState<{ seatId: string }[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const canReserve = isStudentReservationAllowed() && user?.role === 'student';

  useEffect(() => {
    Promise.all([
      fetch('/api/seats').then(r => r.json()),
      fetch(`/api/seat-reservations?date=${getCurrentKSTDate()}`).then(r => r.json()),
    ]).then(([s, r]) => { setSeats(s); setReservedSeats(r); });
  }, []);

  async function handleReserve() {
    if (!selectedSeat || !purpose) return;
    setLoading(true);
    const res = await fetch('/api/seat-reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId: selectedSeat.id, purpose }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`${selectedSeat.label} 좌석 예약 완료!`);
      setSelectedSeat(null);
      setPurpose('');
      const updated = await fetch(`/api/seat-reservations?date=${getCurrentKSTDate()}`).then(r => r.json());
      setReservedSeats(updated);
    } else {
      setMessage(data.error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      <h1 className="text-xl font-bold mb-2">방과 후 좌석 예약</h1>
      <p className="text-sm text-gray-500 mb-6">{getCurrentKSTDate()} · 예약 가능 시간: 07:00~13:10</p>
      {!canReserve && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">현재 예약 가능 시간이 아닙니다.</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">{message}</div>}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center">
        <SeatMap seats={seats} reservedSeats={reservedSeats} onSeatClick={setSelectedSeat} canReserve={canReserve} />
      </div>
      {selectedSeat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold mb-3">{selectedSeat.label} 좌석 예약</h2>
            <input
              placeholder="이용 목적"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#E8899A]"
            />
            <div className="flex gap-2">
              <button onClick={() => setSelectedSeat(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">취소</button>
              <button onClick={handleReserve} disabled={loading || !purpose} className="flex-1 bg-[#E8899A] text-white rounded-lg py-2 text-sm disabled:opacity-50">예약</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
