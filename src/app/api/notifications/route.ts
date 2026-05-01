import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import type { Notification } from '@/types';

export async function GET() {
  const supabase = getSupabase();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map(r => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      message: r.message,
      isRead: r.is_read,
      createdAt: r.created_at,
    }))
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const body: Omit<Notification, 'id' | 'createdAt'> = await req.json();
  const { error } = await supabase.from('notifications').insert({
    user_id: body.userId,
    type: body.type,
    message: body.message,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabase();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await req.json();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', session.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
