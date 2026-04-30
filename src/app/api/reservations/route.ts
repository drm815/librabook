import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import type { Reservation } from '@/types';

function rowToReservation(row: string[]): Reservation {
  return {
    id: row[0], date: row[1], periodId: row[2],
    type: row[3] as Reservation['type'],
    teacherId: row[4], className: row[5], grade: row[6],
    purpose: row[7], status: row[8] as Reservation['status'],
    createdAt: row[9], updatedAt: row[10],
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const date = searchParams.get('date');
  const session = await getSession();

  const rows = await getSheetData('reservations');
  let reservations = rows.slice(1).map(rowToReservation).filter(r => r.status !== 'cancelled');

  if (month) reservations = reservations.filter(r => r.date.startsWith(month));
  if (date) reservations = reservations.filter(r => r.date === date);

  // 권한별 정보 필터링
  if (!session || session.role === 'student') {
    return NextResponse.json(reservations.map(r => ({ id: r.id, date: r.date, periodId: r.periodId, type: r.type, status: r.status })));
  }
  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'student') {
    return NextResponse.json({ error: '선생님만 수업 예약 가능' }, { status: 403 });
  }

  const body: Omit<Reservation, 'id' | 'status' | 'createdAt' | 'updatedAt'> = await req.json();

  // 이벤트 타입은 관리자만
  if (body.type === 'event' && session.role !== 'admin') {
    return NextResponse.json({ error: '행사 등록은 관리자만 가능' }, { status: 403 });
  }

  // 충돌 확인
  const rows = await getSheetData('reservations');
  const existing = rows.slice(1).map(r => ({
    id: r[0], date: r[1], periodId: r[2], status: r[8],
    teacherId: r[4], className: r[5], grade: r[6], type: r[3],
  })).find(r => r.date === body.date && r.periodId === body.periodId && r.status !== 'cancelled');

  if (existing) {
    return NextResponse.json({
      conflict: true,
      existing: { id: existing.id, teacherId: existing.teacherId, className: existing.className, grade: existing.grade, type: existing.type }
    }, { status: 409 });
  }

  const now = new Date().toISOString();
  const id = generateId();
  await appendRow('reservations', [id, body.date, body.periodId, body.type, session.userId, body.className, body.grade, body.purpose, 'confirmed', now, now]);

  return NextResponse.json({ success: true, id });
}
