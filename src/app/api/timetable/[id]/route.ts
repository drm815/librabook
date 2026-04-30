import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { id } = await params;
  const { isHoliday }: { isHoliday: boolean } = await req.json();
  const rows = await getSheetData('timetable_config');
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex === -1) return NextResponse.json({ error: '없음' }, { status: 404 });

  const row = rows[rowIndex];
  await updateRow('timetable_config', rowIndex + 1, [row[0], row[1], row[2], row[3], String(isHoliday)]);
  return NextResponse.json({ success: true });
}
