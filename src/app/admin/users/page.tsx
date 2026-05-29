'use client';
import { useState, useEffect } from 'react';

interface UserRow {
  id: string;
  name: string;
  role: string;
  student_id: string | null;
  subject: string | null;
}

function roleLabel(role: string) {
  if (role === 'admin') return '관리자';
  if (role === 'teacher') return '교사';
  return '학생';
}

function roleBadgeClass(role: string) {
  if (role === 'admin') return 'bg-purple-100 text-purple-700';
  if (role === 'teacher') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({});
  const [resetting, setResetting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => {
        console.log('[admin/users] response:', data);
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('[admin/users] error:', err);
        setLoading(false);
      });
  }, []);

  const filtered = search.trim()
    ? users.filter(u =>
        u.name.includes(search) ||
        (u.student_id ?? '').includes(search) ||
        (u.subject ?? '').includes(search)
      )
    : users;

  async function handleReset(userId: string) {
    const pw = newPasswords[userId]?.trim();
    if (!pw || pw.length < 4) {
      setResults(prev => ({ ...prev, [userId]: { ok: false, msg: '4자 이상 입력하세요.' } }));
      return;
    }
    setResetting(userId);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword: pw }),
      });
      const json = await res.json();
      if (res.ok) {
        setResults(prev => ({ ...prev, [userId]: { ok: true, msg: '초기화 완료!' } }));
        setNewPasswords(prev => ({ ...prev, [userId]: '' }));
      } else {
        setResults(prev => ({ ...prev, [userId]: { ok: false, msg: json.error ?? '실패' } }));
      }
    } catch {
      setResults(prev => ({ ...prev, [userId]: { ok: false, msg: '네트워크 오류' } }));
    } finally {
      setResetting(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      <h1 className="text-xl font-bold mb-6">회원 비밀번호 초기화</h1>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름, 학번, 과목으로 검색..."
          autoComplete="off"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#E8899A] bg-white"
        />
      </div>

      {loading && <p className="text-center text-sm text-gray-400 py-8">불러오는 중...</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">
          {search ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
        </p>
      )}

      <div className="space-y-3">
        {filtered.map(user => (
          <div key={user.id} className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roleBadgeClass(user.role)}`}>
                {roleLabel(user.role)}
              </span>
              <span className="text-sm font-bold text-gray-800">{user.name}</span>
              {user.subject && <span className="text-xs text-gray-400">{user.subject}</span>}
              {user.student_id && <span className="text-xs text-gray-400">({user.student_id})</span>}
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                value={newPasswords[user.id] ?? ''}
                onChange={e => setNewPasswords(prev => ({ ...prev, [user.id]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleReset(user.id)}
                placeholder="새 비밀번호 (4자 이상)"
                autoComplete="new-password"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
              />
              <button
                onClick={() => handleReset(user.id)}
                disabled={resetting === user.id}
                className="px-4 py-2 bg-[#E8899A] text-white text-xs font-bold rounded-xl disabled:opacity-50 whitespace-nowrap hover:bg-[#e0728a] transition-colors"
              >
                {resetting === user.id ? '처리 중...' : '초기화'}
              </button>
            </div>

            {results[user.id] && (
              <p className={`text-xs mt-1.5 ${results[user.id].ok ? 'text-green-600' : 'text-red-500'}`}>
                {results[user.id].msg}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
