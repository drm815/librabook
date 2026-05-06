'use client';
import { useState, useEffect } from 'react';
import { DEFAULT_PERIODS } from '@/lib/constants';

interface PeriodInput { name: string; startTime: string; endTime: string }

function getDaysInMonth(year: number, month: number) {
  const days: { date: string; dow: number }[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push({
      date: `${d.getFullYear()}-${mm}-${dd}`,
      dow: d.getDay(),
    });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export default function TimetableSettings() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [periods, setPeriods] = useState<PeriodInput[]>(DEFAULT_PERIODS);
  const [periodsLoaded, setPeriodsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 교시 설정 불러오기 (최초 1회)
  useEffect(() => {
    fetch('/api/periods').then(r => r.json()).then(data => {
      if (data && data.length > 0) {
        setPeriods(data.map((p: { name: string; startTime: string; endTime: string }) => ({
          name: p.name, startTime: p.startTime, endTime: p.endTime,
        })));
      }
      setPeriodsLoaded(true);
    });
  }, []);

  const days = getDaysInMonth(year, month);
  const firstDow = days[0]?.dow ?? 0; // 첫 날 요일 (0=일)

  function toggleHoliday(date: string, dow: number) {
    if (dow === 0 || dow === 6) return; // 주말은 항상 휴일
    setHolidays(prev => {
      const next = new Set(prev);
      if (next.has(date)) { next.delete(date); } else { next.add(date); }
      return next;
    });
  }

  function prevMonth() {
    setHolidays(new Set());
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    setHolidays(new Set());
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  async function handleGenerateTimetable() {
    setLoading(true);
    setMessage('');
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, holidays: [...holidays] }),
    });
    setMessage(res.ok ? `${year}년 ${month}월 타임테이블 생성 완료` : '오류 발생');
    setLoading(false);
  }

  async function handleSavePeriods() {
    setLoading(true);
    setMessage('');
    const res = await fetch('/api/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(periods),
    });
    if (res.ok) {
      setMessage('교시 설정 저장 완료 (다음달 생성 시에도 자동 적용됩니다)');
    } else {
      const data = await res.json();
      setMessage(`오류: ${data.error ?? '저장 실패'}`);
    }
    setLoading(false);
  }

  const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-10">
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* 타임테이블 생성 */}
      <section>
        <h2 className="text-lg font-bold mb-1">월 단위 타임테이블 생성</h2>
        <p className="text-xs text-gray-400 mb-4">날짜를 클릭해 공휴일을 지정하세요. 주말은 자동으로 제외됩니다.</p>

        {/* 월 이동 */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">◀</button>
          <span className="font-bold text-base w-28 text-center">{year}년 {month}월</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">▶</button>
        </div>

        {/* 달력 */}
        <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
          <div className="grid grid-cols-7 bg-gray-50">
            {DOW_LABELS.map(d => (
              <div key={d} className={`text-center text-xs font-medium py-2 ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-gray-500'}`}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {/* 첫 날 앞 빈 칸 */}
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {days.map(({ date, dow }) => {
              const isWeekend = dow === 0 || dow === 6;
              const isHoliday = holidays.has(date);
              const day = Number(date.split('-')[2]);
              return (
                <button
                  key={date}
                  onClick={() => toggleHoliday(date, dow)}
                  disabled={isWeekend}
                  className={[
                    'aspect-square flex items-center justify-center text-sm transition-colors',
                    isWeekend ? 'cursor-default' : 'hover:bg-gray-50 cursor-pointer',
                    dow === 0 ? 'text-red-300' : dow === 6 ? 'text-blue-300' : '',
                    isHoliday ? 'bg-[#F9C4D2] text-[#E8899A] font-bold rounded-lg' : '',
                    isWeekend ? 'bg-gray-50 text-opacity-50' : '',
                  ].join(' ')}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {holidays.size > 0 && (
          <div className="text-xs text-gray-500 mb-3">
            공휴일 지정: {[...holidays].sort().map(d => d.slice(5)).join(', ')}
          </div>
        )}

        <button
          onClick={handleGenerateTimetable}
          disabled={loading}
          className="bg-[#E8899A] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? '생성 중...' : `${year}년 ${month}월 생성`}
        </button>
      </section>

      {/* 교시 설정 */}
      <section>
        <h2 className="text-lg font-bold mb-1">교시 시간 설정</h2>
        <p className="text-xs text-gray-400 mb-4">한 번 저장하면 이후 모든 달 타임테이블에 자동 적용됩니다.</p>
        {!periodsLoaded ? (
          <div className="text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {periods.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={p.name}
                    onChange={e => setPeriods(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    className="border border-gray-200 rounded-lg px-3 py-2 w-28 text-sm focus:outline-none focus:border-[#E8899A]"
                  />
                  <input
                    type="time"
                    value={p.startTime}
                    onChange={e => setPeriods(prev => prev.map((x, j) => j === i ? { ...x, startTime: e.target.value } : x))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
                  />
                  <span className="text-gray-400 text-sm">~</span>
                  <input
                    type="time"
                    value={p.endTime}
                    onChange={e => setPeriods(prev => prev.map((x, j) => j === i ? { ...x, endTime: e.target.value } : x))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
                  />
                  <button
                    onClick={() => setPeriods(prev => prev.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPeriods(prev => [...prev, { name: '', startTime: '', endTime: '' }])}
                className="border border-gray-200 text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                + 교시 추가
              </button>
              <button
                onClick={handleSavePeriods}
                disabled={loading}
                className="bg-[#E8899A] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
