'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface DayReservations {
  date: string;
  dayOfWeek: string;
  periods: { periodId: string; periodName: string }[];
}

interface SeatStatus {
  date: string;
  reserved: number;
  total: number;
}

function getThisWeekDates(): { date: string; dow: string }[] {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dow = kst.getUTCDay();
  const monday = new Date(kst);
  monday.setUTCDate(kst.getUTCDate() - (dow === 0 ? 6 : dow - 1));

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    return { date: dateStr, dow: days[d.getUTCDay()] };
  });
}

function getTodayKST(): string {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const weekDates = getThisWeekDates();
  const today = getTodayKST();
  const monthStr = today.slice(0, 7);

  const [classReservations, setClassReservations] = useState<DayReservations[]>([]);
  const [seatStatuses, setSeatStatuses] = useState<SeatStatus[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [totalSeats, setTotalSeats] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [periodsRes, seatsRes, reservationsRes] = await Promise.all([
        fetch('/api/periods'),
        fetch('/api/seats'),
        fetch(`/api/reservations?month=${monthStr}`),
      ]);
      const periodsData = await periodsRes.json();
      const seatsData = await seatsRes.json();
      const reservationsData = await reservationsRes.json();

      const activePeriods: { id: string; name: string }[] = Array.isArray(periodsData)
        ? periodsData.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
        : [];
      setPeriods(activePeriods);

      const activeSeats = Array.isArray(seatsData) ? seatsData.filter((s: { isActive: boolean }) => s.isActive) : [];
      setTotalSeats(activeSeats.length);

      // 수업 예약 현황
      const weekDays = weekDates.map(w => {
        const dayReservations = Array.isArray(reservationsData)
          ? reservationsData.filter((r: { date: string }) => r.date === w.date)
          : [];
        const reservedPeriods = dayReservations.map((r: { periodId: string }) => {
          const period = activePeriods.find(p => p.id === r.periodId);
          return { periodId: r.periodId, periodName: period?.name ?? '' };
        });
        return { date: w.date, dayOfWeek: w.dow, periods: reservedPeriods };
      });
      setClassReservations(weekDays);

      // 좌석 예약 현황 (날짜별 병렬 fetch)
      const seatFetches = await Promise.all(
        weekDates.map(w => fetch(`/api/seat-reservations?date=${w.date}`).then(r => r.json()))
      );
      const seatData = weekDates.map((w, i) => ({
        date: w.date,
        reserved: Array.isArray(seatFetches[i]) ? seatFetches[i].length : 0,
        total: activeSeats.length,
      }));
      setSeatStatuses(seatData);
      setLoading(false);
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TYPE_COLOR: Record<string, string> = {
    class: 'bg-[#B8E0D2]',
    event: 'bg-[#C9B8E8]',
    'self-study': 'bg-[#F9C4D2]',
  };

  return (
    <div className="min-h-screen bg-[#FDF6F0]">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#333]">LibraBook</h1>
        <div className="flex items-center gap-3">
          {user ? (
            <button onClick={() => router.push('/timetable')} className="text-sm text-[#E8899A] font-medium">
              타임테이블 →
            </button>
          ) : (
            <button onClick={() => router.push('/login')} className="text-sm bg-[#E8899A] text-white px-4 py-1.5 rounded-lg font-medium">
              로그인
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-gray-700">이번 주 도서관 현황</h2>
            <p className="text-xs text-gray-400 mt-0.5">{weekDates[0]?.date} ~ {weekDates[4]?.date}</p>
          </div>
          {!user && (
            <button
              onClick={() => router.push('/login')}
              className="text-sm bg-[#E8899A] text-white px-4 py-1.5 rounded-lg font-medium"
            >
              로그인
            </button>
          )}
          {user && (
            <button
              onClick={() => router.push('/timetable')}
              className="text-sm text-[#E8899A] font-medium"
            >
              타임테이블 →
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 도서관 수업 예약 현황 */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">수업 예약 현황</h3>
              <div className="space-y-2">
                {classReservations.map(day => {
                  const isToday = day.date === today;
                  return (
                    <div
                      key={day.date}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isToday ? 'bg-[#FDF6F0]' : ''}`}
                    >
                      <div className={`w-8 text-center text-xs font-bold ${isToday ? 'text-[#E8899A]' : 'text-gray-400'}`}>
                        {day.dayOfWeek}
                      </div>
                      <div className="flex-1 flex flex-wrap gap-1">
                        {periods.map(p => {
                          const reserved = day.periods.some(dp => dp.periodId === p.id);
                          return (
                            <span
                              key={p.id}
                              className={`text-xs px-2 py-0.5 rounded-full ${reserved ? 'bg-[#E8899A] text-white' : 'bg-gray-100 text-gray-400'}`}
                            >
                              {p.name}
                            </span>
                          );
                        })}
                        {periods.length === 0 && (
                          <span className="text-xs text-gray-300">교시 없음</span>
                        )}
                      </div>
                      {day.periods.length === 0 && (
                        <span className="text-xs text-gray-300">예약 없음</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#E8899A] inline-block" /> 예약됨</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-100 inline-block" /> 비어있음</span>
              </div>
            </div>

            {/* 열람석 예약 현황 */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">열람석 예약 현황</h3>
              <div className="space-y-2">
                {seatStatuses.map((day, i) => {
                  const isToday = day.date === today;
                  const pct = day.total > 0 ? Math.round((day.reserved / day.total) * 100) : 0;
                  const dow = weekDates[i]?.dow ?? '';
                  return (
                    <div
                      key={day.date}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isToday ? 'bg-[#FDF6F0]' : ''}`}
                    >
                      <div className={`w-8 text-center text-xs font-bold ${isToday ? 'text-[#E8899A]' : 'text-gray-400'}`}>
                        {dow}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#E8899A] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 w-16 text-right">
                        {day.reserved}/{day.total}석
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
                전체 {totalSeats}석 기준
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
