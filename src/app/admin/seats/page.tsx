'use client';
import { useState, useEffect } from 'react';
import type { Seat } from '@/types';

export default function AdminSeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(6);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/seats?all=true')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSeats(data);
      });
  }, []);

  // 현재 설정된 좌석을 그리드로 표현
  const maxRow = seats.length > 0 ? Math.max(...seats.map(s => s.row)) : 0;
  const maxCol = seats.length > 0 ? Math.max(...seats.map(s => s.col)) : 0;

  function getSeat(row: number, col: number) {
    return seats.find(s => s.row === row && s.col === col);
  }

  async function handleGenerate() {
    if (!confirm(`${rows}행 × ${cols}열 = ${rows * cols}개 좌석을 새로 생성합니다. 기존 좌석은 모두 삭제됩니다.`)) return;
    setLoading(true);
    setMessage('');

    // 기존 좌석 비활성화 후 새로 생성
    const newSeats = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const num = (r - 1) * cols + c;
        newSeats.push({ row: r, col: c, label: `${num}번`, isActive: true });
      }
    }

    const res = await fetch('/api/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSeats),
    });

    if (res.ok) {
      const updated = await fetch('/api/seats?all=true').then(r => r.json());
      setSeats(updated);
      setMessage(`${rows * cols}개 좌석이 생성됐습니다.`);
    } else {
      const err = await res.json();
      setMessage(`오류: ${err.error}`);
    }
    setLoading(false);
  }

  async function toggleSeat(seat: Seat) {
    const res = await fetch(`/api/seats/${seat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !seat.isActive }),
    });
    if (res.ok) {
      setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, isActive: !s.isActive } : s));
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">열람석 배치 설정</h1>

      {/* 새 배치 생성 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="font-bold mb-4">새 배치 생성</h2>
        <div className="flex items-center gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-500 block mb-1">행 수</label>
            <input
              type="number" min={1} max={20} value={rows}
              onChange={e => setRows(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-20 focus:outline-none focus:border-[#E8899A]"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">열 수</label>
            <input
              type="number" min={1} max={20} value={cols}
              onChange={e => setCols(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-20 focus:outline-none focus:border-[#E8899A]"
            />
          </div>
          <div className="self-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[#E8899A] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? '생성 중...' : '배치 생성'}
            </button>
          </div>
        </div>
        {message && (
          <p className={`text-sm ${message.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>
        )}
      </div>

      {/* 현재 배치 미리보기 */}
      {seats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold mb-2">현재 배치</h2>
          <p className="text-sm text-gray-500 mb-4">좌석을 클릭하면 활성/비활성을 토글합니다.</p>
          <div className="mb-4 text-xs text-gray-400 flex gap-4">
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-[#B8E0D2] inline-block" /> 활성</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gray-200 inline-block" /> 비활성</span>
          </div>
          {/* 입구 표시 */}
          <div className="text-center text-xs text-gray-400 mb-2">▼ 입구</div>
          <div
            className="grid gap-2 w-fit"
            style={{ gridTemplateColumns: `repeat(${maxCol}, minmax(48px, 1fr))` }}
          >
            {Array.from({ length: maxRow }, (_, ri) =>
              Array.from({ length: maxCol }, (_, ci) => {
                const seat = getSeat(ri + 1, ci + 1);
                if (!seat) return (
                  <div key={`${ri}-${ci}`} className="w-12 h-12" />
                );
                return (
                  <button
                    key={seat.id}
                    onClick={() => toggleSeat(seat)}
                    className={`w-12 h-12 rounded-lg text-xs font-medium transition-colors ${
                      seat.isActive ? 'bg-[#B8E0D2] hover:bg-[#9ecfc0] text-gray-700' : 'bg-gray-200 hover:bg-gray-300 text-gray-400'
                    }`}
                  >
                    {seat.label}
                  </button>
                );
              })
            )}
          </div>
          <p className="text-sm text-gray-500 mt-4">총 {seats.filter(s => s.isActive).length}개 활성 좌석</p>
        </div>
      )}
    </div>
  );
}
