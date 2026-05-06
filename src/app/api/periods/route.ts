import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { DEFAULT_PERIODS } from '@/lib/constants';

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('periods')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) {
    return NextResponse.json(
      DEFAULT_PERIODS.map((p, i) => ({ id: String(i + 1), ...p }))
    );
  }

  return NextResponse.json(
    data.map(r => ({ id: r.id, name: r.name, startTime: r.start_time, endTime: r.end_time }))
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const periods: { name: string; startTime: string; endTime: string }[] = await req.json();

  // 기존 교시 id 목록 조회 후 삭제
  const { data: existing } = await supabase.from('periods').select('id');
  const existingIds = (existing ?? []).map(r => r.id);
  if (existingIds.length > 0) {
    await supabase.from('periods').delete().in('id', existingIds);
  }

  const { error } = await supabase.from('periods').insert(
    periods.map(p => ({ name: p.name, start_time: p.startTime, end_time: p.endTime }))
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
