'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { UserRole } from '@/types';

const AUTO_LOGOUT_MS = 30 * 60 * 1000; // 30분
const LAST_ACTIVITY_KEY = 'librabook_last_activity';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  isLibraryMember?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const doLogout = useCallback(async () => {
    clearTimer();
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('librabook_user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    window.location.href = '/login';
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    clearTimer();
    timerRef.current = setTimeout(doLogout, AUTO_LOGOUT_MS);
  }, [clearTimer, doLogout]);

  useEffect(() => {
    const stored = localStorage.getItem('librabook_user');
    if (stored) {
      // 마지막 활동 시간 확인 - 이미 30분 초과했으면 자동 로그아웃
      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (lastActivity && Date.now() - parseInt(lastActivity) > AUTO_LOGOUT_MS) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        doLogout();
        setLoading(false);
        return;
      }
      setUser(JSON.parse(stored));
      resetTimer();
    }
    setLoading(false);
  }, [doLogout, resetTimer]);

  // 사용자 활동 감지
  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimer();
    };
  }, [user, resetTimer, clearTimer]);

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
      resetTimer();
      return data.user;
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    const data = await res.json();
    localStorage.setItem('librabook_user', JSON.stringify(data.user));
    setUser(data.user);
    resetTimer();
    return data.user;
  }

  async function logout() {
    await doLogout();
  }

  return { user, loading, login, logout };
}
