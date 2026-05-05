import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !session.isLibraryMember) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }
  const { id } = await params;
  const supabase = getSupabase();
  // 본인 기록만 삭제 가능
  const { error } = await supabase
    .from('library_activities')
    .delete()
    .eq('id', id)
    .eq('user_id', session.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
