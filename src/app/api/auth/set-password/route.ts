import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabase } from '@/lib/supabase';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { userId, newPassword } = await req.json();
  if (!userId || !newPassword) {
    return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 });
  }
  if (newPassword.length < 4) {
    return NextResponse.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, { status: 400 });
  }

  const supabase = getSupabase();

  // 초기화 상태(password_hash=null)인 유저만 허용
  const { data: user } = await supabase
    .from('users')
    .select('id, name, role, student_id, password_hash')
    .eq('id', userId)
    .is('password_hash', null)
    .single();

  if (!user) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(newPassword, 10);
  await supabase.from('users').update({ password_hash }).eq('id', userId);

  // 도서부 여부 확인
  let isLibraryMember = false;
  if (user.role === 'student' && user.student_id) {
    const { data: memberData } = await supabase
      .from('library_members')
      .select('id')
      .eq('student_id', user.student_id)
      .limit(1)
      .single();
    isLibraryMember = !!memberData;
  }

  const token = await signToken({ userId: user.id, role: user.role, name: user.name, isLibraryMember });

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name, role: user.role, isLibraryMember },
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
