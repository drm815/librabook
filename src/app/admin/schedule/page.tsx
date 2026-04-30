'use client';
import { useState, useEffect } from 'react';
import type { Schedule, Period } from '@/types';

const DAY_OPTIONS = ['월', '화', '수', '목', '금'];
const TYPE_OPTIONS = [{ value: 'class', label: '수업' }, { value: 'event', label: '행사' }, { value: 'self-study', label: '자율학습' }];

export default function AdminSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [form, setForm] = useState({ dayOfWeek: '월', periodId: '', type: 'class', assignedTo: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/schedules').then(r => r.json()),
      fetch('/api/periods').then(r => r.json()),
    ]).then(([s, p]) => { setSchedules(s); setPeriods(p); if (p.length) setForm(f => ({ ...f, periodId: p[0].id })); });
  }, []);

  async function handleAdd() {
    setLoading(true);
    await fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const updated = await fetch('/api/schedules').then(r => r.json());
    setSchedules(updated);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await fetch('/api/schedules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setSchedules(prev => prev.filter(s => s.id !== id));
  }

  const TYPE_LABELS: Record<string, string> = { class: '수업', event: '행사', 'self-study': '자율학습' };

  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      <h1 className="text-xl font-bold mb-6">정기 일정 관리</h1>
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="font-bold mb-4">새 정기 일정 등록</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            {DAY_OPTIONS.map(d => <option key={d}>{d}</option>)}
          </select>
          <select value={form.periodId} onChange={e => setForm(f => ({ ...f, periodId: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input placeholder="담당자" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="설명" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2" />
        </div>
        <button onClick={handleAdd} disabled={loading} className="mt-3 bg-[#E8899A] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">등록</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-bold mb-4">등록된 정기 일정</h2>
        {schedules.length === 0 ? <p className="text-sm text-gray-400">등록된 일정이 없습니다.</p> : (
          <div className="space-y-2">
            {schedules.map(s => {
              const period = periods.find(p => p.id === s.periodId);
              return (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">{s.dayOfWeek}요일 {period?.name}</span>
                    <span className="text-gray-500 ml-2">{TYPE_LABELS[s.type]} · {s.assignedTo} · {s.description}</span>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
