import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId, getCurrentKSTDate, isStudentReservationAllowed } from '@/lib/utils';
import type { SeatReservation } from '@/types';

function rowToSeatRes(row: string[]): SeatReservation {
  return { id: row[0], date: row[1], seatId: row[2], studentId: row[3], purpose: row[4], status: row[5] as SeatReservation['status'], createdAt: row[6] };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? getCurrentKSTDate();
  const session = await getSession();

  const rows = await getSheetData('seat_reservations');
  const reservations = rows.slice(1).map(rowToSeatRes).filter(r => r.date === date && r.status !== 'cancelled');

  if (!session || session.role === 'student') {
    return NextResponse.json(reservations.map(r => ({ id: r.id, seatId: r.seatId, date: r.date })));
  }
  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: '학생만 좌석 예약 가능' }, { status: 403 });
  }
  if (!isStudentReservationAllowed()) {
    return NextResponse.json({ error: '좌석 예약은 07:00~13:10 사이에만 가능합니다.' }, { status: 400 });
  }

  const { seatId, purpose }: { seatId: string; purpose: string } = await req.json();
  const today = getCurrentKSTDate();

  const rows = await getSheetData('seat_reservations');
  const todayReservations = rows.slice(1).map(rowToSeatRes).filter(r => r.date === today && r.status !== 'cancelled');

  if (todayReservations.some(r => r.studentId === session.userId)) {
    return NextResponse.json({ error: '당일 좌석은 1개만 예약 가능합니다.' }, { status: 400 });
  }
  if (todayReservations.some(r => r.seatId === seatId)) {
    return NextResponse.json({ error: '이미 예약된 좌석입니다.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  await appendRow('seat_reservations', [generateId(), today, seatId, session.userId, purpose, 'confirmed', now]);
  return NextResponse.json({ success: true });
}
