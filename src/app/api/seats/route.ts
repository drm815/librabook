import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import type { Seat } from '@/types';

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('seats')
    .select('*')
    .eq('is_active', true)
    .order('row', { ascending: true })
    .order('col', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map(r => ({ id: r.id, row: r.row, col: r.col, label: r.label, isActive: r.is_active }))
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const seats: Omit<Seat, 'id'>[] = await req.json();
  const { error } = await supabase.from('seats').insert(
    seats.map(s => ({ row: s.row, col: s.col, label: s.label, is_active: s.isActive }))
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
