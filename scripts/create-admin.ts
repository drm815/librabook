import bcrypt from 'bcryptjs';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const passwordHash = await bcrypt.hash('admin1234', 10);
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'users',
    valueInputOption: 'RAW',
    requestBody: { values: [['admin-001', '관리자', 'admin', '', '', passwordHash, new Date().toISOString()]] },
  });
  console.log('✓ 관리자 계정 생성 완료 (비밀번호: admin1234)');
}
main().catch(console.error);
