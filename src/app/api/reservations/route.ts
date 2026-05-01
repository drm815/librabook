import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const date = searchParams.get('date');
  const session = await getSession();

  let query = supabase
    .from('reservations')
    .select('*')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  if (month) query = query.like('date', `${month}%`);
  if (date) query = query.eq('date', date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reservations = (data ?? []).map(r => ({
    id: r.id,
    date: r.date,
    periodId: r.period_id,
    type: r.type,
    teacherId: r.teacher_id,
    className: r.class_name,
    grade: r.grade,
    purpose: r.purpose,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  if (!session || session.role === 'student') {
    return NextResponse.json(
      reservations.map(r => ({ id: r.id, date: r.date, periodId: r.periodId, type: r.type, status: r.status }))
    );
  }
  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'student') {
    return NextResponse.json({ error: '선생님만 수업 예약 가능' }, { status: 403 });
  }

  const body: { date: string; periodId: string; type: string; className: string; grade: string; purpose: string } = await req.json();

  if (body.type === 'event' && session.role !== 'admin') {
    return NextResponse.json({ error: '행사 등록은 관리자만 가능' }, { status: 403 });
  }

  // 충돌 확인
  const { data: existing } = await supabase
    .from('reservations')
    .select('id, teacher_id, class_name, grade, type')
    .eq('date', body.date)
    .eq('period_id', body.periodId)
    .neq('status', 'cancelled')
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({
      conflict: true,
      existing: {
        id: existing.id,
        teacherId: existing.teacher_id,
        className: existing.class_name,
        grade: existing.grade,
        type: existing.type,
      },
    }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: inserted, error } = await supabase
    .from('reservations')
    .insert({
      date: body.date,
      period_id: body.periodId,
      type: body.type,
      teacher_id: session.userId,
      class_name: body.className,
      grade: body.grade,
      purpose: body.purpose,
      status: 'confirmed',
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: inserted.id });
}
