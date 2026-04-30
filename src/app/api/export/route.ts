import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  const rows = await getSheetData('reservations');
  let data = rows.slice(1).filter(r => r[8] !== 'cancelled');
  if (month) data = data.filter(r => r[1].startsWith(month));

  const ws = XLSX.utils.aoa_to_sheet([
    ['ID', '날짜', '교시ID', '유형', '선생님ID', '학년/반', '학년', '목적', '상태', '생성일', '수정일'],
    ...data,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '예약현황');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reservations-${month ?? 'all'}.xlsx"`,
    },
  });
}
