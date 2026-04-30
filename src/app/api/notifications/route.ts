import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateRow, appendRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import type { Notification } from '@/types';

function rowToNotification(row: string[]): Notification {
  return { id: row[0], userId: row[1], type: row[2] as Notification['type'], message: row[3], isRead: row[4] === 'true', createdAt: row[5] };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const rows = await getSheetData('notifications');
  const notifications = rows.slice(1).map(rowToNotification)
    .filter(n => n.userId === session.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);
  return NextResponse.json(notifications);
}

export async function POST(req: NextRequest) {
  const body: Omit<Notification, 'id' | 'createdAt'> = await req.json();
  const now = new Date().toISOString();
  await appendRow('notifications', [generateId(), body.userId, body.type, body.message, 'false', now]);
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await req.json();
  const rows = await getSheetData('notifications');
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex === -1) return NextResponse.json({ error: '없음' }, { status: 404 });

  const row = rows[rowIndex];
  await updateRow('notifications', rowIndex + 1, [row[0], row[1], row[2], row[3], 'true', row[5]]);
  return NextResponse.json({ success: true });
}
