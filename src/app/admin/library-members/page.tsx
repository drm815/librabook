'use client';
import { useState, useEffect } from 'react';
import type { LibraryMember } from '@/types';

function parseStudentId(studentId: string) {
  const grade = studentId[0] ?? '?';
  const classNum = studentId[1] ?? '?';
  return { grade, classNum };
}

export default function AdminLibraryMembersPage() {
  const [members, setMembers] = useState<LibraryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ studentId: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/library-members');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setMembers(data);
      } else {
        setError(data.error ?? '데이터를 불러올 수 없습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await fetch('/api/library-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setForm({ studentId: '', name: '' });
      setSuccess('도서부원이 등록되었습니다.');
      await load();
      setTimeout(() => setSuccess(''), 2000);
    } else {
      setError(data.error);
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} 학생을 도서부 명단에서 삭제할까요?`)) return;
    await fetch(`/api/library-members/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      <h1 className="text-xl font-bold mb-6">도서부 명단 관리</h1>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <h2 className="font-bold text-gray-700 mb-4">도서부원 등록</h2>
        <form onSubmit={handleAdd} className="flex gap-3 flex-wrap">
          <input
            placeholder="학번 (예: 20301 → 2학년 3반 1번)"
            value={form.studentId}
            onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
            required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A] w-64"
          />
          <input
            placeholder="이름"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A] w-32"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#E8899A] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {submitting ? '등록 중...' : '등록'}
          </button>
          {error && <p className="text-xs text-red-500 self-center">{error}</p>}
          {success && <p className="text-xs text-green-600 font-medium self-center">{success}</p>}
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">학번</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이름</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">학년/반</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">등록일</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">불러오는 중...</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">등록된 도서부원이 없습니다.</td></tr>
            ) : members.map(m => {
              const { grade, classNum } = parseStudentId(m.studentId);
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{m.studentId}</td>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-gray-600">{grade}학년 {classNum}반</td>
                  <td className="px-4 py-3 text-gray-400">{m.createdAt?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(m.id, m.name)}
                      className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
