'use client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Stats {
  total: number;
  byType: Record<string, number>;
  byPeriod: Record<string, number>;
}

export default function AdminDashboard() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reservations?month=${month}`)
      .then(r => r.json())
      .then((reservations: Array<{ type: string; periodId: string }>) => {
        const byType: Record<string, number> = {};
        const byPeriod: Record<string, number> = {};
        for (const r of reservations) {
          byType[r.type] = (byType[r.type] ?? 0) + 1;
          byPeriod[r.periodId] = (byPeriod[r.periodId] ?? 0) + 1;
        }
        setStats({ total: reservations.length, byType, byPeriod });
        setLoading(false);
      });
  }, [month]);

  function handleExport() {
    window.open(`/api/export?month=${month}`, '_blank');
  }

  const TYPE_LABELS: Record<string, string> = { class: '수업', event: '행사', 'self-study': '자율학습' };

  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">통계 대시보드</h1>
        <button onClick={handleExport} className="bg-[#E8899A] text-white px-4 py-2 rounded-lg text-sm font-medium">엑셀 내보내기</button>
      </div>
      <div className="mb-4">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      {loading ? (
        <div className="text-center py-10 text-gray-400">불러오는 중...</div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold mb-4">총 예약 건수</h2>
            <p className="text-3xl font-bold text-[#E8899A]">{stats.total}건</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold mb-4">유형별 현황</h2>
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex justify-between text-sm py-1">
                <span>{TYPE_LABELS[type] ?? type}</span>
                <span className="font-medium">{count}건</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
