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

  // 기존 교시 전체 조회
  const { data: existing, error: fetchError } = await supabase.from('periods').select('id');
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const existingIds = (existing ?? []).map(r => r.id);

  // 삭제
  if (existingIds.length > 0) {
    const { error: deleteError } = await supabase.from('periods').delete().in('id', existingIds);
    if (deleteError) return NextResponse.json({ error: `삭제 실패: ${deleteError.message}` }, { status: 500 });
  }

  // 삭제 후 실제로 비었는지 확인
  const { data: afterDelete } = await supabase.from('periods').select('id');
  const remaining = (afterDelete ?? []).length;
  if (remaining > 0) {
    return NextResponse.json({
      error: `삭제 후 ${remaining}개 행이 남아있습니다. (before: ${existingIds.length}개) Supabase 콘솔에서 periods 테이블의 RLS DELETE 정책을 확인해주세요.`
    }, { status: 500 });
  }

  const { error } = await supabase.from('periods').insert(
    periods.map(p => ({ name: p.name, start_time: p.startTime, end_time: p.endTime }))
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, inserted: periods.length });
}
