'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

export default function LoginForm() {
  const [role, setRole] = useState<UserRole>('teacher');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      const user = await login(body);
      router.push(user.role === 'admin' ? '/admin/timetable' : '/timetable');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-[#333333] mb-2">LibraBook</h1>
        <p className="text-center text-sm text-gray-500 mb-6">도서관 예약 시스템</p>

        {/* 역할 선택 탭 */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          {(['teacher', 'student', 'admin'] as UserRole[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
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
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
                required
              />
              <input
                type="text"
                placeholder="과목"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
                required
              />
            </>
          )}
          {role === 'student' && (
            <input
              type="text"
              placeholder="학번"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
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
