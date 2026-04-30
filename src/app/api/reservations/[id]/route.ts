import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateRow, appendRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const rows = await getSheetData('reservations');
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex === -1) return NextResponse.json({ error: '없음' }, { status: 404 });

  const row = rows[rowIndex];
  // 권한 확인: 본인 예약 또는 관리자
  if (session.role !== 'admin' && row[4] !== session.userId) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  // 이력 기록
  const historyId = generateId();
  await appendRow('reservation_history', [historyId, id, session.userId, JSON.stringify(row), JSON.stringify(body), new Date().toISOString()]);

  const now = new Date().toISOString();
  await updateRow('reservations', rowIndex + 1, [
    row[0], body.date ?? row[1], body.periodId ?? row[2],
    body.type ?? row[3], row[4], body.className ?? row[5],
    body.grade ?? row[6], body.purpose ?? row[7],
    body.status ?? row[8], row[9], now,
  ]);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await params;
  const rows = await getSheetData('reservations');
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex === -1) return NextResponse.json({ error: '없음' }, { status: 404 });

  const row = rows[rowIndex];
  if (session.role !== 'admin' && row[4] !== session.userId) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const now = new Date().toISOString();
  await updateRow('reservations', rowIndex + 1, [
    row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], 'cancelled', row[9], now,
  ]);

  return NextResponse.json({ success: true });
}
