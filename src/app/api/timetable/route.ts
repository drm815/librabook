import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { getMonthDays, getDayOfWeekKor } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  let query = supabase
    .from('timetable_config')
    .select('*')
    .order('date', { ascending: true });

  if (month) query = query.eq('month', month);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    data.map(r => ({
      id: r.id,
      month: r.month,
      date: r.date,
      dayOfWeek: r.day_of_week,
      isHoliday: r.is_holiday,
    }))
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { year, month, holidays = [] }: { year: number; month: number; holidays: string[] } =
    await req.json();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const days = getMonthDays(year, month);

  const rows = days.map(day => {
    const dateStr = day.toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeekKor(day);
    const isHoliday =
      holidays.includes(dateStr) || day.getDay() === 0 || day.getDay() === 6;
    return { month: monthStr, date: dateStr, day_of_week: dayOfWeek, is_holiday: isHoliday };
  });

  // 기존 날짜 조회
  const { data: existing } = await supabase
    .from('timetable_config')
    .select('date')
    .eq('month', monthStr);

  const existingDates = new Set((existing ?? []).map(r => r.date));

  const toInsert = rows.filter(r => !existingDates.has(r.date));
  const toUpdate = rows.filter(r => existingDates.has(r.date));

  // 새 날짜만 insert
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('timetable_config').insert(toInsert);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 기존 날짜는 is_holiday만 업데이트
  for (const row of toUpdate) {
    const { error: updateError } = await supabase
      .from('timetable_config')
      .update({ is_holiday: row.is_holiday })
      .eq('date', row.date);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
