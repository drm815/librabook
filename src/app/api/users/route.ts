import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const body: {
    name: string;
    role: 'teacher' | 'student';
    subject?: string;
    studentId?: string;
    password: string;
  } = await req.json();

  if (body.role === 'student' && (!body.studentId || body.studentId.length !== 6)) {
    return NextResponse.json({ error: '학번은 6자리로 입력해주세요.' }, { status: 400 });
  }

  let dupQuery = supabase.from('users').select('id').eq('role', body.role);
  if (body.role === 'teacher') {
    dupQuery = dupQuery.eq('name', body.name).eq('subject', body.subject ?? '');
  } else {
    dupQuery = dupQuery.eq('student_id', body.studentId ?? '');
  }
  const { data: existing } = await dupQuery.limit(1).single();
  if (existing) {
    return NextResponse.json({ error: '이미 등록된 사용자입니다.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const { error } = await supabase.from('users').insert({
    name: body.name,
    role: body.role,
    subject: body.subject ?? null,
    student_id: body.studentId ?? null,
    password_hash: passwordHash,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
