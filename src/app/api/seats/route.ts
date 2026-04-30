import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import type { Seat } from '@/types';

function rowToSeat(row: string[]): Seat {
  return { id: row[0], row: Number(row[1]), col: Number(row[2]), label: row[3], isActive: row[4] === 'true' };
}

export async function GET() {
  const rows = await getSheetData('seats');
  return NextResponse.json(rows.slice(1).filter(r => r[4] === 'true').map(rowToSeat));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }
  const seats: Omit<Seat, 'id'>[] = await req.json();
  for (const seat of seats) {
    await appendRow('seats', [generateId(), String(seat.row), String(seat.col), seat.label, String(seat.isActive)]);
  }
  return NextResponse.json({ success: true });
}
