import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSheetData, appendRow } from '@/lib/sheets';
import { generateId } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const body: { name: string; role: 'teacher' | 'student'; subject?: string; studentId?: string; password: string } = await req.json();

  const rows = await getSheetData('users');
  // 중복 확인
  const exists = rows.slice(1).some(row => {
    if (body.role === 'teacher') return row[1] === body.name && row[3] === body.subject;
    if (body.role === 'student') return row[4] === body.studentId;
    return false;
  });
  if (exists) {
    return NextResponse.json({ error: '이미 등록된 사용자입니다.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const now = new Date().toISOString();
  await appendRow('users', [generateId(), body.name, body.role, body.subject ?? '', body.studentId ?? '', passwordHash, now]);
  return NextResponse.json({ success: true });
}
