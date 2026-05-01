import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import type { Schedule } from '@/types';

export async function GET() {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('is_active', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map(r => ({
      id: r.id,
      dayOfWeek: r.day_of_week,
      periodId: r.period_id,
      type: r.type,
      assignedTo: r.assigned_to,
      description: r.description,
      isActive: r.is_active,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const body: Omit<Schedule, 'id' | 'isActive'> = await req.json();
  const { error } = await supabase.from('schedules').insert({
    day_of_week: body.dayOfWeek,
    period_id: body.periodId,
    type: body.type,
    assigned_to: body.assignedTo,
    description: body.description,
    is_active: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { id } = await req.json();
  const { error } = await supabase
    .from('schedules')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
