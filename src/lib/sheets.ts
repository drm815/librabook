import { google } from 'googleapis';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

export async function getSheetData(sheetName: string): Promise<string[][]> {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  return (response.data.values as string[][]) ?? [];
}

export async function appendRow(sheetName: string, values: string[]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

export async function updateRow(sheetName: string, rowIndex: number, values: string[]): Promise<void> {
  // rowIndex는 1-based (헤더 포함), 데이터 행은 2부터 시작
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

export async function deleteRow(sheetName: string, rowIndex: number): Promise<void> {
  const sheets = getSheets();
  // 행 삭제는 batchUpdate 필요 — sheetId 먼저 조회
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName);
  if (!sheet?.properties?.sheetId) throw new Error(`Sheet ${sheetName} not found`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,  // 0-based
            endIndex: rowIndex,
          },
        },
      }],
    },
  });
}

// 헤더 행을 포함한 시트의 행 수 반환
export async function getRowCount(sheetName: string): Promise<number> {
  const data = await getSheetData(sheetName);
  return data.length;
}
