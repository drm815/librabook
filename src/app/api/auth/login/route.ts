import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { role, password } = body;

  let query = supabase.from('users').select('*').eq('role', role);

  if (role === 'admin') {
    // admin은 role만으로 조회
  } else if (role === 'teacher') {
    query = query.eq('name', body.name).eq('subject', body.subject);
  } else if (role === 'student') {
    query = query.eq('student_id', body.studentId);
  } else {
    return NextResponse.json({ error: '잘못된 역할' }, { status: 400 });
  }

  const { data, error } = await query.limit(1).single();

  if (error || !data) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, data.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const token = await signToken({ userId: data.id, role: data.role, name: data.name });

  const response = NextResponse.json({
    success: true,
    user: { id: data.id, name: data.name, role: data.role },
  });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
  return response;
}
