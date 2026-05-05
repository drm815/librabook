import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('library_members')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }
  const supabase = getSupabase();
  const body: { studentId: string; name: string } = await req.json();

  const { data: existing } = await supabase
    .from('library_members')
    .select('id')
    .eq('student_id', body.studentId)
    .limit(1)
    .single();
  if (existing) {
    return NextResponse.json({ error: '이미 등록된 학번입니다.' }, { status: 409 });
  }

  const { error } = await supabase.from('library_members').insert({
    student_id: body.studentId,
    name: body.name,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
