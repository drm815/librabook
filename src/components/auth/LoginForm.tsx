'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

const SESSION_KEY = 'librabook_login_form';

export default function LoginForm() {
  const [role, setRole] = useState<UserRole>('teacher');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 비번 초기화 상태
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const { role: r, name: n, subject: s, studentId: sid } = JSON.parse(saved);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (r) setRole(r);
      if (typeof n === 'string') setName(n);
      if (typeof s === 'string') setSubject(s);
      if (typeof sid === 'string') setStudentId(sid);
    }
  }, []);

  function saveForm(patch: Partial<{ role: UserRole; name: string; subject: string; studentId: string }>) {
    const saved = sessionStorage.getItem(SESSION_KEY);
    const current = saved ? JSON.parse(saved) : {};
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...patch }));
  }

  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body: Record<string, string> = { role, password };
      if (role === 'teacher') { body.name = name; body.subject = subject; }
      if (role === 'student') { body.studentId = studentId; }
      const result = await login(body);
      if (result?.resetRequired) {
        setResetUserId(result.userId as string);
        setLoading(false);
        return;
      }
      sessionStorage.removeItem(SESSION_KEY);
      if (result.role === 'admin') router.push('/admin/timetable');
      else if (result.role === 'student') router.push('/reserve/student');
      else router.push('/timetable');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== newPasswordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUserId, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      sessionStorage.removeItem(SESSION_KEY);
      if (data.user.role === 'admin') router.push('/admin/timetable');
      else if (data.user.role === 'student') router.push('/reserve/student');
      else router.push('/timetable');
    } catch {
      setError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  // 비번 초기화 후 새 비번 설정 화면
  if (resetUserId) {
    return (
      <div className="min-h-screen bg-[#FDF6F0] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-[#333333] mb-2">LibraBook</h1>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800">
            관리자에 의해 비밀번호가 초기화되었습니다.<br />새 비밀번호를 설정해주세요.
          </div>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <input
              type="password"
              placeholder="새 비밀번호 (4자 이상)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={4}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
              required
            />
            <input
              type="password"
              placeholder="새 비밀번호 확인"
              value={newPasswordConfirm}
              onChange={e => setNewPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8899A] text-white py-3 rounded-lg font-medium hover:bg-[#d4758a] transition-colors disabled:opacity-50"
            >
              {loading ? '설정 중...' : '비밀번호 설정'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-[#333333] mb-2">LibraBook</h1>
        <p className="text-center text-sm text-gray-500 mb-6">도서관 예약 시스템</p>

        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          {(['teacher', 'student', 'admin'] as UserRole[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => { setRole(r as UserRole); saveForm({ role: r as UserRole }); setPassword(''); setError(''); }}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                role === r ? 'bg-white shadow text-[#E8899A] font-medium' : 'text-gray-500'
              }`}
            >
              {r === 'teacher' ? '선생님' : r === 'student' ? '학생' : '관리자'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {role === 'teacher' && (
            <>
              <input
                type="text"
                placeholder="이름"
                value={name}
                onChange={e => { setName(e.target.value); saveForm({ name: e.target.value }); }}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
                required
              />
              <input
                type="text"
                placeholder="과목"
                value={subject}
                onChange={e => { setSubject(e.target.value); saveForm({ subject: e.target.value }); }}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
                required
              />
            </>
          )}
          {role === 'student' && (
            <input
              type="text"
              placeholder="학번 (6자리)"
              value={studentId}
              onChange={e => { setStudentId(e.target.value); saveForm({ studentId: e.target.value }); }}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
              maxLength={6}
              required
            />
          )}
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E8899A] text-white py-3 rounded-lg font-medium hover:bg-[#d4758a] transition-colors disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
