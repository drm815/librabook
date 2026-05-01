import { createClient } from '@supabase/supabase-js';

// service role key: 서버사이드 전용, RLS 우회
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
