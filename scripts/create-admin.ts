import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const passwordHash = await bcrypt.hash('admin1234', 10);
  const { error } = await supabase.from('users').insert({
    name: '관리자',
    role: 'admin',
    password_hash: passwordHash,
  });

  if (error) {
    console.error('오류:', error.message);
    process.exit(1);
  }
  console.log('✓ 관리자 계정 생성 완료 (비밀번호: admin1234)');
}
main().catch(console.error);
