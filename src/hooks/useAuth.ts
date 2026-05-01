'use client';
import { useState, useEffect } from 'react';
import type { UserRole } from '@/types';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('librabook_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  async function login(body: Record<string, string>) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // 사용자 없음(404) + teacher/student → 자동 등록 후 재로그인
    if (res.status === 404 && body.role !== 'admin') {
      const registerBody: Record<string, string> = {
        role: body.role,
        password: body.password,
      };
      if (body.role === 'teacher') {
        registerBody.name = body.name;
        registerBody.subject = body.subject;
      } else {
        registerBody.studentId = body.studentId;
        registerBody.name = body.studentId; // student는 학번을 이름으로
      }

      const regRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerBody),
      });

      if (!regRes.ok) {
        const err = await regRes.json();
        throw new Error(err.error);
      }

      // 등록 후 재로그인
      const retryRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!retryRes.ok) {
        const err = await retryRes.json();
        throw new Error(err.error);
      }
      const data = await retryRes.json();
      localStorage.setItem('librabook_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    const data = await res.json();
    localStorage.setItem('librabook_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('librabook_user');
    setUser(null);
  }

  return { user, loading, login, logout };
}
