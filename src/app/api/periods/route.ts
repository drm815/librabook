import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { DEFAULT_PERIODS } from '@/lib/constants';
import type { Period } from '@/types';

function rowToPeriod(row: string[]): Period {
  return { id: row[0], name: row[1], startTime: row[2], endTime: row[3] };
}

export async function GET() {
  const rows = await getSheetData('periods');
  const periods = rows.slice(1).map(rowToPeriod);
  // 교시가 없으면 기본값 반환
  if (periods.length === 0) {
    return NextResponse.json(DEFAULT_PERIODS.map((p, i) => ({ id: String(i + 1), ...p })));
  }
  return NextResponse.json(periods);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const periods: Omit<Period, 'id'>[] = await req.json();

  // 기존 데이터 전체 교체: 헤더 포함 행 수 확인 후 새로 추가
  const rows = await getSheetData('periods');
  // 기존 데이터 행 삭제는 appendRow 전에 클리어 필요
  // 간단하게: 헤더(row1) 유지, row2부터 overwrite
  for (let i = 0; i < periods.length; i++) {
    const id = generateId();
    const rowIndex = i + 2; // 헤더(1) + 데이터 시작(2)
    if (i < rows.length - 1) {
      await updateRow('periods', rowIndex, [id, periods[i].name, periods[i].startTime, periods[i].endTime]);
    } else {
      await appendRow('periods', [id, periods[i].name, periods[i].startTime, periods[i].endTime]);
    }
  }
  return NextResponse.json({ success: true });
}
