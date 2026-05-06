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

  // name 기준 upsert (unique constraint 활용)
  const { error } = await supabase
    .from('periods')
    .upsert(
      periods.map(p => ({ name: p.name, start_time: p.startTime, end_time: p.endTime })),
      { onConflict: 'name' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // upsert에 없는 교시(삭제된 교시) 제거
  const { data: current } = await supabase.from('periods').select('id, name');
  const keepNames = new Set(periods.map(p => p.name));
  const toDelete = (current ?? []).filter(r => !keepNames.has(r.name)).map(r => r.id);
  if (toDelete.length > 0) {
    await supabase.from('periods').delete().in('id', toDelete);
  }

  return NextResponse.json({ success: true });
}
