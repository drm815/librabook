import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { error } = await supabase
    .from('users')
    .update({ password_hash: null })
    .eq('id', userId);

  if (error) return NextResponse.json({ error: '초기화 실패' }, { status: 500 });

  return NextResponse.json({ success: true });
}
