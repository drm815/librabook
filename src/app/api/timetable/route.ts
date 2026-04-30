import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId, getMonthDays, getDayOfWeekKor } from '@/lib/utils';
import type { TimetableDay } from '@/types';

function rowToDay(row: string[]): TimetableDay {
  return { id: row[0], month: row[1], date: row[2], dayOfWeek: row[3], isHoliday: row[4] === 'true' };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // 'YYYY-MM'
  const rows = await getSheetData('timetable_config');
  let days = rows.slice(1).map(rowToDay);
  if (month) days = days.filter(d => d.month === month);
  return NextResponse.json(days);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { year, month, holidays = [] }: { year: number; month: number; holidays: string[] } = await req.json();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const days = getMonthDays(year, month);

  for (const day of days) {
    const dateStr = day.toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeekKor(day);
    const isHoliday = holidays.includes(dateStr) || day.getDay() === 0 || day.getDay() === 6;
    await appendRow('timetable_config', [generateId(), monthStr, dateStr, dayOfWeek, String(isHoliday)]);
  }

  return NextResponse.json({ success: true });
}
