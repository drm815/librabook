import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import type { Schedule } from '@/types';

function rowToSchedule(row: string[]): Schedule {
  return { id: row[0], dayOfWeek: row[1], periodId: row[2], type: row[3] as Schedule['type'], assignedTo: row[4], description: row[5], isActive: row[6] === 'true' };
}

export async function GET() {
  const rows = await getSheetData('schedules');
  return NextResponse.json(rows.slice(1).map(rowToSchedule).filter(s => s.isActive));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }
  const body: Omit<Schedule, 'id' | 'isActive'> = await req.json();
  await appendRow('schedules', [generateId(), body.dayOfWeek, body.periodId, body.type, body.assignedTo, body.description, 'true']);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }
  const { id } = await req.json();
  const rows = await getSheetData('schedules');
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex === -1) return NextResponse.json({ error: '없음' }, { status: 404 });
  const row = rows[rowIndex];
  await updateRow('schedules', rowIndex + 1, [row[0], row[1], row[2], row[3], row[4], row[5], 'false']);
  return NextResponse.json({ success: true });
}
