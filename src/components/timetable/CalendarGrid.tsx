'use client';
import { useState } from 'react';
import type { TimetableDay, Period, Reservation } from '@/types';

interface Props {
  days: TimetableDay[];
  periods: Period[];
  getReservation: (date: string, periodId: string) => Reservation | undefined;
  onCellClick?: (date: string, periodId: string, reservation?: Reservation) => void;
  onCustomClick?: (date: string) => void;
  userRole?: string;
}

const TYPE_BG: Record<string, string> = {
  class: 'bg-[#B8E0D2]',
  event: 'bg-[#C9B8E8]',
  'self-study': 'bg-[#F9C4D2]',
};

const DOW_ORDER = ['월', '화', '수', '목', '금'];

function getWeeks(days: TimetableDay[]) {
  const allDays = days.filter(d => !['토', '일'].includes(d.dayOfWeek));

  // 주 단위로 묶기
  const weeks: TimetableDay[][] = [];
  let week: TimetableDay[] = [];
  for (const day of allDays) {
    week.push(day);
    if (day.dayOfWeek === '금' || day === allDays[allDays.length - 1]) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);
  return { weeks, allDays };
}

export default function CalendarGrid({ days, periods, getReservation, onCellClick, onCustomClick, userRole }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { weeks, allDays } = getWeeks(days);

  const today = new Date().toISOString().split('T')[0];

  function handleDayClick(date: string, isHoliday: boolean) {
    if (isHoliday) return;
    setSelectedDate(prev => prev === date ? null : date);
  }

  const selectedDay = allDays.find(d => d.date === selectedDate);

  return (
    <div>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-5 gap-2 mb-2">
        {DOW_ORDER.map(dow => (
          <div key={dow} className="text-center text-xs font-medium text-gray-400 py-1">{dow}</div>
        ))}
      </div>

      {/* 달력 주 단위 */}
      <div className="space-y-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-5 gap-2">
            {/* 월~금 5칸 채우기 (주 시작/끝 빈 칸 처리) */}
            {DOW_ORDER.map(dow => {
              const day = week.find(d => d.dayOfWeek === dow);
              if (!day) return <div key={dow} />;

              const dayNum = day.date.slice(8);
              const isToday = day.date === today;
              const isSelected = day.date === selectedDate;
              const reservations = periods
                .map(p => getReservation(day.date, p.id))
                .filter(Boolean) as Reservation[];
              const reservedCount = reservations.length;

              return (
                <button
                  key={day.date}
                  onClick={() => handleDayClick(day.date, day.isHoliday)}
                  disabled={day.isHoliday}
                  className={[
                    'rounded-xl p-2 text-left transition-all border',
                    day.isHoliday
                      ? 'bg-[#F9C4D2] border-[#f0a0b5] cursor-default'
                      : isSelected
                        ? 'bg-white border-[#E8899A] shadow-md'
                        : 'bg-white border-gray-100 hover:border-[#E8899A] hover:shadow-sm',
                  ].join(' ')}
                >
                  <div className={[
                    'text-sm font-bold mb-1',
                    day.isHoliday ? 'text-[#c0566a]' : isToday ? 'text-[#E8899A]' : 'text-gray-700',
                  ].join(' ')}>
                    {dayNum}
                    {isToday && !day.isHoliday && <span className="ml-1 text-[10px] font-normal text-[#E8899A]">오늘</span>}
                  </div>

                  {day.isHoliday ? (
                    <div className="text-xs font-bold text-[#c0566a] mt-1">휴일</div>
                  ) : reservedCount === 0 ? (
                    <div className="text-[10px] text-gray-300">비어있음</div>
                  ) : (
                    <div className="flex flex-wrap gap-0.5">
                      {reservations.map(r => (
                        <span
                          key={r.id}
                          className={`inline-block w-2.5 h-2.5 rounded-sm ${TYPE_BG[r.type] ?? 'bg-gray-200'}`}
                          title={r.type}
                        />
                      ))}
                      <div className="w-full text-[10px] text-gray-400 mt-0.5">{reservedCount}교시 예약됨</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 선택된 날 교시 패널 */}
      {selectedDate && selectedDay && (
        <div className="mt-4 bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-gray-700">
              {selectedDate.slice(5).replace('-', '/')} ({selectedDay.dayOfWeek}) 교시별 현황
            </h3>
            <div className="flex items-center gap-2">
              {(userRole === 'teacher' || userRole === 'admin') && (
                <button
                  onClick={() => onCustomClick?.(selectedDate)}
                  className="text-xs bg-[#E8899A] text-white px-3 py-1 rounded-lg font-medium"
                >
                  + 기타 이용 신청
                </button>
              )}
              <button onClick={() => setSelectedDate(null)} className="text-xs text-gray-400 hover:text-gray-600">닫기</button>
            </div>
          </div>
          <div className="space-y-1.5">
            {periods.map(period => {
              const reservation = getReservation(selectedDate, period.id);
              const canAct = userRole === 'teacher' || userRole === 'admin';
              return (
                <button
                  key={period.id}
                  onClick={() => canAct && onCellClick?.(selectedDate, period.id, reservation)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors text-left',
                    reservation
                      ? `${TYPE_BG[reservation.type] ?? 'bg-gray-100'} hover:opacity-90`
                      : canAct
                        ? 'bg-white border border-dashed border-gray-200 hover:border-[#E8899A] hover:bg-[#FDF6F0]'
                        : 'bg-white border border-gray-100',
                  ].join(' ')}
                >
                  <div className="w-14 shrink-0">
                    <div className="text-xs font-medium text-gray-700">{period.name}</div>
                    <div className="text-[10px] text-gray-400">{period.startTime}</div>
                  </div>
                  {reservation ? (
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {reservation.grade ? `${reservation.grade}-${reservation.className}` : reservation.className}
                      </div>
                      <div className="text-[10px] text-gray-600 truncate">{reservation.purpose}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-300">
                      {canAct ? '클릭하여 예약' : ''}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
