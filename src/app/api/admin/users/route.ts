import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role, student_id, subject, created_at')
    .order('role')
    .order('name');

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 });

  return NextResponse.json(data);
}
