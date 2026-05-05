import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('library_activities')
    .select('*')
    .eq('user_id', session.userId)
    .order('date', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.isLibraryMember) {
    return NextResponse.json({ error: '도서부원만 기록할 수 있습니다.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const body: { date: string; content: string } = await req.json();

  const { error } = await supabase.from('library_activities').insert({
    user_id: session.userId,
    date: body.date,
    content: body.content,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
