import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const session = await getSession();
  if (!session || session.role === 'student') {
    return NextResponse.json({ error: '선생님만 예약 가능' }, { status: 403 });
  }

  const body: {
    dates: string[];       // ['2026-05-06', '2026-05-13', ...]
    periodIds: string[];   // ['period-uuid-1', 'period-uuid-2']
    type: string;
    className: string;
    grade: string;
    purpose: string;
  } = await req.json();

  if (!body.dates?.length || !body.periodIds?.length) {
    return NextResponse.json({ error: '날짜와 교시를 선택해주세요' }, { status: 400 });
  }

  // 이미 예약된 조합 확인
  const { data: existing } = await supabase
    .from('reservations')
    .select('date, period_id')
    .in('date', body.dates)
    .in('period_id', body.periodIds)
    .neq('status', 'cancelled');

  const existingSet = new Set(
    (existing ?? []).map(r => `${r.date}|${r.period_id}`)
  );

  const now = new Date().toISOString();
  const toInsert = [];
  for (const date of body.dates) {
    for (const periodId of body.periodIds) {
      if (!existingSet.has(`${date}|${periodId}`)) {
        toInsert.push({
          date,
          period_id: periodId,
          type: body.type,
          teacher_id: session.userId,
          class_name: body.className,
          grade: body.grade,
          purpose: body.purpose,
          status: 'confirmed',
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ success: true, inserted: 0, skipped: existingSet.size });
  }

  const { error } = await supabase.from('reservations').insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    inserted: toInsert.length,
    skipped: existingSet.size,
  });
}
