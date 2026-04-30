'use client';
import { useState } from 'react';
import { DEFAULT_PERIODS } from '@/lib/constants';

interface PeriodInput { name: string; startTime: string; endTime: string }

export default function TimetableSettings() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [holidays, setHolidays] = useState('');
  const [periods, setPeriods] = useState<PeriodInput[]>(DEFAULT_PERIODS);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleGenerateTimetable() {
    setLoading(true);
    const holidayList = holidays.split(',').map(s => s.trim()).filter(Boolean);
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, holidays: holidayList }),
    });
    setMessage(res.ok ? `${year}년 ${month}월 타임테이블 생성 완료` : '오류 발생');
    setLoading(false);
  }

  async function handleSavePeriods() {
    setLoading(true);
    const res = await fetch('/api/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(periods),
    });
    setMessage(res.ok ? '교시 설정 저장 완료' : '오류 발생');
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{message}</div>}

      <section>
        <h2 className="text-lg font-bold mb-4">월 단위 타임테이블 생성</h2>
        <div className="flex gap-3 flex-wrap">
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 w-24 text-sm" placeholder="연도" />
          <input type="number" value={month} onChange={e => setMonth(Number(e.target.value))} min={1} max={12} className="border border-gray-200 rounded-lg px-3 py-2 w-20 text-sm" placeholder="월" />
          <input value={holidays} onChange={e => setHolidays(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[200px] text-sm" placeholder="공휴일 (YYYY-MM-DD, 쉼표 구분)" />
          <button onClick={handleGenerateTimetable} disabled={loading} className="bg-[#E8899A] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">생성</button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4">교시 시간 설정</h2>
        <div className="space-y-2">
          {periods.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={p.name} onChange={e => setPeriods(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="border border-gray-200 rounded-lg px-3 py-2 w-28 text-sm" />
              <input type="time" value={p.startTime} onChange={e => setPeriods(prev => prev.map((x, j) => j === i ? { ...x, startTime: e.target.value } : x))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <span className="text-gray-400">~</span>
              <input type="time" value={p.endTime} onChange={e => setPeriods(prev => prev.map((x, j) => j === i ? { ...x, endTime: e.target.value } : x))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
        </div>
        <button onClick={handleSavePeriods} disabled={loading} className="mt-4 bg-[#E8899A] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">저장</button>
      </section>
    </div>
  );
}
