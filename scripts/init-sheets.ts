import { google } from 'googleapis';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SHEETS_CONFIG = [
  { name: 'users', headers: ['id','name','role','subject','studentId','passwordHash','createdAt'] },
  { name: 'timetable_config', headers: ['id','month','date','dayOfWeek','isHoliday'] },
  { name: 'periods', headers: ['id','name','startTime','endTime'] },
  { name: 'reservations', headers: ['id','date','periodId','type','teacherId','className','grade','purpose','status','createdAt','updatedAt'] },
  { name: 'seats', headers: ['id','row','col','label','isActive'] },
  { name: 'seat_reservations', headers: ['id','date','seatId','studentId','purpose','status','createdAt'] },
  { name: 'schedules', headers: ['id','dayOfWeek','periodId','type','assignedTo','description','isActive'] },
  { name: 'notifications', headers: ['id','userId','type','message','isRead','createdAt'] },
  { name: 'reservation_history', headers: ['id','reservationId','changedBy','oldData','newData','changedAt'] },
];

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  for (const { name, headers } of SHEETS_CONFIG) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${name}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
    console.log(`✓ ${name} 헤더 설정 완료`);
  }
}

main().catch(console.error);
