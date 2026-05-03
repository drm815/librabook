'use client';
import { useState, useEffect } from 'react';
import type { Seat } from '@/types';

type SectionKey = 'left' | 'right';

interface SectionState {
  rows: number;
  cols: number;
  selected: Set<string>;
  labels: Record<string, string>;
}

function emptySection(rows = 6, cols = 5): SectionState {
  return { rows, cols, selected: new Set(), labels: {} };
}

export default function AdminSeatsPage() {
  const [sections, setSections] = useState<Record<SectionKey, SectionState>>({
    left: emptySection(),
    right: emptySection(),
  });
  const [editingLabel, setEditingLabel] = useState<{ section: SectionKey; key: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/seats?all=true')
      .then(r => r.json())
      .then((data: Seat[]) => {
        if (!Array.isArray(data) || data.length === 0) return;

        // section 구분: col이 절반 이하 → left, 초과 → right
        // 저장 시 right 섹션은 col에 1000을 더해서 구분
        const leftSeats = data.filter(s => s.col < 1000);
        const rightSeats = data.filter(s => s.col >= 1000);

        function toSectionState(seats: Seat[], colOffset = 0): SectionState {
          if (seats.length === 0) return emptySection();
          const maxRow = Math.max(...seats.map(s => s.row));
          const maxCol = Math.max(...seats.map(s => s.col - colOffset));
          const selected = new Set<string>();
          const labels: Record<string, string> = {};
          seats.forEach(s => {
            const key = `${s.row}-${s.col - colOffset}`;
            if (s.isActive) selected.add(key);
            labels[key] = s.label;
          });
          return { rows: maxRow, cols: maxCol, selected, labels };
        }

        setSections({
          left: toSectionState(leftSeats, 0),
          right: toSectionState(rightSeats, 1000),
        });
      });
  }, []);

  function updateSection(section: SectionKey, patch: Partial<SectionState>) {
    setSections(prev => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  }

  function toggleCell(section: SectionKey, row: number, col: number) {
    const key = `${row}-${col}`;
    const s = sections[section];
    const next = new Set(s.selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      if (!s.labels[key]) {
        updateSection(section, { labels: { ...s.labels, [key]: `${next.size}번` }, selected: next });
        return;
      }
    }
    updateSection(section, { selected: next });
  }

  function handleLabelChange(section: SectionKey, key: string, value: string) {
    setSections(prev => ({
      ...prev,
      [section]: { ...prev[section], labels: { ...prev[section].labels, [key]: value } },
    }));
  }

  function renumber(section: SectionKey, startNum: number) {
    const s = sections[section];
    const newLabels = { ...s.labels };
    let num = startNum;
    for (let r = 1; r <= s.rows; r++) {
      for (let c = 1; c <= s.cols; c++) {
        const key = `${r}-${c}`;
        if (s.selected.has(key)) {
          newLabels[key] = `${num}번`;
          num++;
        }
      }
    }
    updateSection(section, { labels: newLabels });
  }

  function renumberAll() {
    // 왼쪽 먼저, 이어서 오른쪽
    const leftCount = sections.left.selected.size;
    renumber('left', 1);
    renumber('right', leftCount + 1);
  }

  async function handleSave() {
    const total = sections.left.selected.size + sections.right.selected.size;
    if (total === 0) { setMessage('좌석을 하나 이상 선택해주세요.'); return; }
    setLoading(true);
    setMessage('');

    const seats = [];
    // left: col 그대로
    const l = sections.left;
    for (let r = 1; r <= l.rows; r++) {
      for (let c = 1; c <= l.cols; c++) {
        const key = `${r}-${c}`;
        if (l.selected.has(key)) {
          seats.push({ row: r, col: c, label: l.labels[key] || key, isActive: true });
        }
      }
    }
    // right: col에 1000 더해서 구분
    const rr = sections.right;
    for (let r = 1; r <= rr.rows; r++) {
      for (let c = 1; c <= rr.cols; c++) {
        const key = `${r}-${c}`;
        if (rr.selected.has(key)) {
          seats.push({ row: r, col: c + 1000, label: rr.labels[key] || key, isActive: true });
        }
      }
    }

    const res = await fetch('/api/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seats),
    });

    if (res.ok) {
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

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3 text-xs text-gray-400 items-center">
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-[#B8E0D2] inline-block" /> 좌석</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border border-dashed border-gray-300 inline-block" /> 빈 공간</span>
          <span className="text-gray-300">|</span>
          <span>이름 더블클릭 → 수정</span>
        </div>
        <div className="flex gap-2">
          <button onClick={renumberAll} className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            전체 번호 재부여
          </button>
          <button onClick={handleSave} disabled={loading} className="bg-[#E8899A] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
        {message && (
          <p className={`w-full text-sm ${message.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>
        )}
      </div>

      {/* 입구 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 border-t border-dashed border-gray-300" />
        <span className="text-xs text-gray-400 px-2">▼ 입구</span>
        <div className="flex-1 border-t border-dashed border-gray-300" />
      </div>

      {/* 좌우 섹션 */}
      <div className="flex gap-6 items-start flex-wrap">
        {(['left', 'right'] as SectionKey[]).map(section => {
          const s = sections[section];
          return (
            <div key={section} className="bg-white rounded-2xl shadow-sm p-6 flex-1 min-w-[280px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">{section === 'left' ? '좌측' : '우측'}</h2>
                <button
                  onClick={() => renumber(section, section === 'left' ? 1 : sections.left.selected.size + 1)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  번호 재부여
                </button>
              </div>
              <div className="flex gap-3 mb-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">행</label>
                  <input
                    type="number" min={1} max={20} value={s.rows}
                    onChange={e => updateSection(section, { rows: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-16 focus:outline-none focus:border-[#E8899A]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">열</label>
                  <input
                    type="number" min={1} max={20} value={s.cols}
                    onChange={e => updateSection(section, { cols: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-16 focus:outline-none focus:border-[#E8899A]"
                  />
                </div>
              </div>

              <div
                className="grid gap-2 w-fit"
                style={{ gridTemplateColumns: `repeat(${s.cols}, 52px)` }}
              >
                {Array.from({ length: s.rows }, (_, ri) =>
                  Array.from({ length: s.cols }, (_, ci) => {
                    const key = `${ri + 1}-${ci + 1}`;
                    const isOn = s.selected.has(key);
                    const isEditing = editingLabel?.section === section && editingLabel?.key === key;
                    return (
                      <div
                        key={key}
                        style={{ width: 52, height: 52 }}
                        className={`rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                          isOn
                            ? 'bg-[#B8E0D2] hover:bg-[#9ecfc0]'
                            : 'border border-dashed border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => !isEditing && toggleCell(section, ri + 1, ci + 1)}
                      >
                        {isOn && (
                          isEditing ? (
                            <input
                              autoFocus
                              value={s.labels[key] || ''}
                              onChange={e => handleLabelChange(section, key, e.target.value)}
                              onBlur={() => setEditingLabel(null)}
                              onKeyDown={e => e.key === 'Enter' && setEditingLabel(null)}
                              onClick={e => e.stopPropagation()}
                              className="w-full text-center text-xs bg-transparent outline-none px-1"
                            />
                          ) : (
                            <span
                              className="text-xs text-gray-700 font-medium select-none"
                              onDoubleClick={e => { e.stopPropagation(); setEditingLabel({ section, key }); }}
                            >
                              {s.labels[key] || ''}
                            </span>
                          )
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">선택된 좌석: {s.selected.size}개</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
