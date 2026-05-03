'use client';
import { useState, useEffect } from 'react';
import type { Seat } from '@/types';

export default function AdminSeatsPage() {
  const [savedSeats, setSavedSeats] = useState<Seat[]>([]);
  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(8);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/seats?all=true')
      .then(r => r.json())
      .then((data: Seat[]) => {
        if (!Array.isArray(data)) return;
        setSavedSeats(data);

        // 저장된 좌석으로 그리드 초기화
        if (data.length > 0) {
          const maxRow = Math.max(...data.map(s => s.row));
          const maxCol = Math.max(...data.map(s => s.col));
          setRows(maxRow);
          setCols(maxCol);

          const newSelected = new Set<string>();
          const newLabels: Record<string, string> = {};
          data.forEach(s => {
            const key = `${s.row}-${s.col}`;
            if (s.isActive) newSelected.add(key);
            newLabels[key] = s.label;
          });
          setSelected(newSelected);
          setLabels(newLabels);
        }
      });
  }, []);

  function toggleCell(row: number, col: number) {
    const key = `${row}-${col}`;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        // 자동 라벨 (선택 순서)
        if (!labels[key]) {
          setLabels(l => ({ ...l, [key]: `${next.size}번` }));
        }
      }
      return next;
    });
  }

  function handleLabelChange(key: string, value: string) {
    setLabels(prev => ({ ...prev, [key]: value }));
  }

  // 선택된 좌석에 번호 자동 재부여
  function renumberSeats() {
    const newLabels = { ...labels };
    let num = 1;
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const key = `${r}-${c}`;
        if (selected.has(key)) {
          newLabels[key] = `${num}번`;
          num++;
        }
      }
    }
    setLabels(newLabels);
  }

  async function handleSave() {
    if (selected.size === 0) {
      setMessage('좌석을 하나 이상 선택해주세요.');
      return;
    }
    setLoading(true);
    setMessage('');

    const seats = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const key = `${r}-${c}`;
        if (selected.has(key)) {
          seats.push({ row: r, col: c, label: labels[key] || `${r}-${c}`, isActive: true });
        }
      }
    }

    const res = await fetch('/api/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seats),
    });

    if (res.ok) {
      const updated = await fetch('/api/seats?all=true').then(r => r.json());
      setSavedSeats(updated);
      setMessage(`${seats.length}개 좌석이 저장됐습니다.`);
    } else {
      const err = await res.json();
      setMessage(`오류: ${err.error}`);
    }
    setLoading(false);
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">열람석 배치 설정</h1>

      {/* 그리드 크기 설정 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="font-bold mb-4">그리드 크기 설정</h2>
        <div className="flex items-center gap-4 flex-wrap">
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
              onClick={renumberSeats}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              번호 재부여
            </button>
          </div>
          <div className="self-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#E8899A] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
        {message && (
          <p className={`text-sm mt-3 ${message.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>
        )}
      </div>

      {/* 배치 편집 그리드 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">배치 편집</h2>
          <div className="flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-[#B8E0D2] inline-block" /> 좌석</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border border-dashed border-gray-300 inline-block" /> 빈 공간</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">칸을 클릭해서 좌석을 추가/제거하세요. 좌석 이름을 더블클릭하면 수정할 수 있습니다.</p>

        <div className="text-center text-xs text-gray-400 mb-3">▼ 입구</div>
        <div
          className="grid gap-2 w-fit"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(52px, 1fr))` }}
        >
          {Array.from({ length: rows }, (_, ri) =>
            Array.from({ length: cols }, (_, ci) => {
              const key = `${ri + 1}-${ci + 1}`;
              const isOn = selected.has(key);
              return (
                <div key={key} className="relative">
                  {isOn ? (
                    <div
                      className="w-13 h-13 rounded-lg bg-[#B8E0D2] cursor-pointer hover:bg-[#9ecfc0] transition-colors flex items-center justify-center"
                      style={{ width: 52, height: 52 }}
                      onClick={() => toggleCell(ri + 1, ci + 1)}
                    >
                      {editingLabel === key ? (
                        <input
                          autoFocus
                          value={labels[key] || ''}
                          onChange={e => handleLabelChange(key, e.target.value)}
                          onBlur={() => setEditingLabel(null)}
                          onKeyDown={e => e.key === 'Enter' && setEditingLabel(null)}
                          onClick={e => e.stopPropagation()}
                          className="w-full text-center text-xs bg-transparent outline-none"
                        />
                      ) : (
                        <span
                          className="text-xs text-gray-700 font-medium select-none"
                          onDoubleClick={e => { e.stopPropagation(); setEditingLabel(key); }}
                        >
                          {labels[key] || ''}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div
                      className="w-13 h-13 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ width: 52, height: 52 }}
                      onClick={() => toggleCell(ri + 1, ci + 1)}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
        <p className="text-sm text-gray-500 mt-4">선택된 좌석: {selected.size}개</p>
      </div>
    </div>
  );
}
