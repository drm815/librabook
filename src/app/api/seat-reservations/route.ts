import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { getCurrentKSTDate, isStudentReservationAllowed } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? getCurrentKSTDate();
  const session = await getSession();

  const { data, error } = await supabase
    .from('seat_reservations')
    .select('*')
    .eq('date', date)
    .neq('status', 'cancelled');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reservations = (data ?? []).map(r => ({
    id: r.id,
    date: r.date,
    seatId: r.seat_id,
    studentId: r.student_id,
    purpose: r.purpose,
    startTime: r.start_time,
    endTime: r.end_time,
    status: r.status,
    createdAt: r.created_at,
  }));

  if (!session || session.role === 'student') {
    return NextResponse.json(reservations.map(r => ({ id: r.id, seatId: r.seatId, date: r.date })));
  }
  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: '학생만 좌석 예약 가능' }, { status: 403 });
  }
  if (!isStudentReservationAllowed()) {
    return NextResponse.json({ error: '좌석 예약은 07:00~15:20 사이에만 가능합니다.' }, { status: 400 });
  }

  const { seatId, purpose, startTime, endTime }: { seatId: string; purpose: string; startTime?: string; endTime?: string } = await req.json();
  const today = getCurrentKSTDate();

  const { data: todayReservations, error: fetchError } = await supabase
    .from('seat_reservations')
    .select('student_id, seat_id')
    .eq('date', today)
    .neq('status', 'cancelled');

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  if ((todayReservations ?? []).some(r => r.student_id === session.userId)) {
    return NextResponse.json({ error: '당일 좌석은 1개만 예약 가능합니다.' }, { status: 400 });
  }
  if ((todayReservations ?? []).some(r => r.seat_id === seatId)) {
    return NextResponse.json({ error: '이미 예약된 좌석입니다.' }, { status: 409 });
  }

  const { error } = await supabase.from('seat_reservations').insert({
    date: today,
    seat_id: seatId,
    student_id: session.userId,
    purpose,
    start_time: startTime ?? null,
    end_time: endTime ?? null,
    status: 'confirmed',
    created_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
