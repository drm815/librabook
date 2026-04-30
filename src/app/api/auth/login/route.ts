import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSheetData } from '@/lib/sheets';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import type { User } from '@/types';

function rowToUser(row: string[]): User {
  return {
    id: row[0],
    name: row[1],
    role: row[2] as User['role'],
    subject: row[3],
    studentId: row[4],
    passwordHash: row[5],
    createdAt: row[6],
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { role, password } = body;

  const rows = await getSheetData('users');
  const dataRows = rows.slice(1); // 헤더 제외

  let user: User | undefined;

  if (role === 'admin') {
    user = dataRows.map(rowToUser).find(u => u.role === 'admin');
  } else if (role === 'teacher') {
    const { name, subject } = body;
    user = dataRows.map(rowToUser).find(
      u => u.role === 'teacher' && u.name === name && u.subject === subject
    );
  } else if (role === 'student') {
    const { studentId } = body;
    user = dataRows.map(rowToUser).find(
      u => u.role === 'student' && u.studentId === studentId
    );
  }

  if (!user) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const token = await signToken({ userId: user.id, role: user.role, name: user.name });

  const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8시간
    path: '/',
  });
  return response;
}
