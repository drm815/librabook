import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { data: existing, error: fetchError } = await supabase
    .from('reservations')
    .select('teacher_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) return NextResponse.json({ error: '없음' }, { status: 404 });
  if (session.role !== 'admin' && existing.teacher_id !== session.userId) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  await supabase.from('reservation_history').insert({
    reservation_id: id,
    changed_by: session.userId,
    changes: JSON.stringify(body),
    changed_at: new Date().toISOString(),
  });

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('reservations')
    .update({
      ...(body.date !== undefined && { date: body.date }),
      ...(body.periodId !== undefined && { period_id: body.periodId }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.className !== undefined && { class_name: body.className }),
      ...(body.grade !== undefined && { grade: body.grade }),
      ...(body.purpose !== undefined && { purpose: body.purpose }),
      ...(body.status !== undefined && { status: body.status }),
      updated_at: now,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await params;

  const { data: existing, error: fetchError } = await supabase
    .from('reservations')
    .select('teacher_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) return NextResponse.json({ error: '없음' }, { status: 404 });
  if (session.role !== 'admin' && existing.teacher_id !== session.userId) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
