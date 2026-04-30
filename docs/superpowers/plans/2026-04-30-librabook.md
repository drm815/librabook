# LibraBook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 중학교 도서관 수업 시간 예약 및 관리 웹앱 LibraBook을 Next.js + Google Sheets API로 구축한다.

**Architecture:** Next.js App Router 기반 풀스택 앱. Google Sheets를 DB로 사용하며 서버리스 API Routes로 CRUD 처리. JWT 기반 자체 인증으로 관리자/선생님/학생 3단계 권한 분리.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Google Sheets API v4, jose (JWT), xlsx (엑셀 내보내기), Vercel 배포

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                    # 루트 레이아웃 (폰트, 전역 스타일)
│   ├── page.tsx                      # 루트 → /login 리다이렉트
│   ├── login/
│   │   └── page.tsx                  # 로그인 화면
│   ├── timetable/
│   │   └── page.tsx                  # 메인 타임테이블 현황 (공통)
│   ├── reserve/
│   │   ├── teacher/page.tsx          # 선생님 예약 신청
│   │   └── student/page.tsx          # 학생 좌석 예약 신청
│   ├── admin/
│   │   ├── timetable/page.tsx        # 관리자 타임테이블 설정
│   │   ├── seats/page.tsx            # 관리자 좌석 배치도 설정
│   │   ├── schedule/page.tsx         # 관리자 정기 일정 등록
│   │   └── dashboard/page.tsx        # 관리자 통계 대시보드
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts        # POST /api/auth/login
│       │   └── logout/route.ts       # POST /api/auth/logout
│       ├── timetable/
│       │   ├── route.ts              # GET/POST /api/timetable
│       │   └── [id]/route.ts         # PUT/DELETE /api/timetable/[id]
│       ├── reservations/
│       │   ├── route.ts              # GET/POST /api/reservations
│       │   └── [id]/route.ts         # PUT/DELETE /api/reservations/[id]
│       ├── seats/
│       │   ├── route.ts              # GET/POST /api/seats
│       │   └── [id]/route.ts         # PUT/DELETE /api/seats/[id]
│       ├── schedules/
│       │   └── route.ts              # GET/POST/DELETE /api/schedules (정기일정)
│       ├── notifications/
│       │   └── route.ts              # GET /api/notifications
│       └── export/
│           └── route.ts              # GET /api/export (엑셀)
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx             # 로그인 폼 컴포넌트
│   ├── timetable/
│   │   ├── TimetableGrid.tsx         # 월별 교시별 그리드
│   │   ├── TimetableCell.tsx         # 개별 셀 (상태별 색상)
│   │   └── PeriodLabel.tsx           # 교시 레이블
│   ├── reservation/
│   │   ├── ReservationModal.tsx      # 예약 신청 모달
│   │   ├── ConflictModal.tsx         # 충돌 협의 모달
│   │   └── SeatMap.tsx               # 좌석 배치도 UI
│   ├── admin/
│   │   ├── TimetableSettings.tsx     # 타임테이블 설정 폼
│   │   ├── SeatSettings.tsx          # 좌석 배치 설정
│   │   ├── ScheduleForm.tsx          # 정기 일정 등록 폼
│   │   └── StatsChart.tsx            # 통계 차트
│   ├── common/
│   │   ├── Header.tsx                # 상단 네비게이션
│   │   ├── Notification.tsx          # 알림 토스트
│   │   └── ProtectedRoute.tsx        # 권한 보호 래퍼
│   └── ui/
│       ├── Button.tsx                # 공통 버튼
│       ├── Modal.tsx                 # 공통 모달
│       └── Badge.tsx                 # 상태 배지
├── lib/
│   ├── sheets.ts                     # Google Sheets API 클라이언트
│   ├── auth.ts                       # JWT 생성/검증
│   ├── constants.ts                  # 상수 (기본 교시, 색상 등)
│   └── utils.ts                      # 날짜, 유틸리티 함수
├── hooks/
│   ├── useAuth.ts                    # 인증 상태 훅
│   ├── useTimetable.ts               # 타임테이블 데이터 훅
│   └── useNotifications.ts           # 알림 훅
├── types/
│   └── index.ts                      # 전체 타입 정의
└── middleware.ts                     # 라우트 보호 미들웨어
```

**Google Sheets 시트 구조:**
- `users` — id, name, role(admin/teacher/student), subject, studentId, passwordHash, createdAt
- `timetable_config` — id, month, date, dayOfWeek, isHoliday
- `periods` — id, name(1교시~7교시+점심), startTime, endTime
- `reservations` — id, date, periodId, type(class/event/self-study), teacherId, className, grade, purpose, status, createdAt, updatedAt
- `seats` — id, row, col, label, isActive
- `seat_reservations` — id, date, seatId, studentId, purpose, status, createdAt
- `schedules` — id, dayOfWeek, periodId, type, assignedTo, description, isActive
- `notifications` — id, userId, type, message, isRead, createdAt
- `reservation_history` — id, reservationId, changedBy, oldData, newData, changedAt

---

## Phase 1: 프로젝트 초기 설정

### Task 1: Next.js 프로젝트 생성 및 의존성 설치

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `src/types/index.ts`
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd /Users/binzzang/development/timetable_lib
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

- [ ] **Step 2: 추가 의존성 설치**

```bash
npm install jose google-auth-library googleapis xlsx date-fns
npm install -D @types/node
```

- [ ] **Step 3: 환경변수 파일 생성**

`.env.local` 생성:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
JWT_SECRET=your_very_long_random_secret_here_at_least_32_chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 4: `.env.example` 생성**

```bash
cat > .env.example << 'EOF'
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SPREADSHEET_ID=
JWT_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 5: `src/types/index.ts` 작성**

```typescript
export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  subject?: string;       // 선생님만
  studentId?: string;     // 학생만
  passwordHash: string;
  createdAt: string;
}

export interface Period {
  id: string;
  name: string;           // '1교시', '점심시간' 등
  startTime: string;      // 'HH:mm'
  endTime: string;
}

export interface TimetableDay {
  id: string;
  month: string;          // 'YYYY-MM'
  date: string;           // 'YYYY-MM-DD'
  dayOfWeek: string;      // '월'~'일'
  isHoliday: boolean;
}

export type ReservationType = 'class' | 'event' | 'self-study';
export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled';

export interface Reservation {
  id: string;
  date: string;
  periodId: string;
  type: ReservationType;
  teacherId: string;
  className: string;
  grade: string;
  purpose: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Seat {
  id: string;
  row: number;
  col: number;
  label: string;
  isActive: boolean;
}

export interface SeatReservation {
  id: string;
  date: string;
  seatId: string;
  studentId: string;
  purpose: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface Schedule {
  id: string;
  dayOfWeek: string;
  periodId: string;
  type: ReservationType;
  assignedTo: string;
  description: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'reserved' | 'conflict' | 'negotiation_complete';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuthPayload {
  userId: string;
  role: UserRole;
  name: string;
}
```

- [ ] **Step 6: `src/lib/constants.ts` 작성**

```typescript
export const DEFAULT_PERIODS = [
  { name: '1교시', startTime: '09:00', endTime: '09:45' },
  { name: '2교시', startTime: '09:55', endTime: '10:40' },
  { name: '3교시', startTime: '10:50', endTime: '11:35' },
  { name: '4교시', startTime: '11:45', endTime: '12:30' },
  { name: '점심시간', startTime: '12:30', endTime: '13:30' },
  { name: '5교시', startTime: '13:30', endTime: '14:15' },
  { name: '6교시', startTime: '14:25', endTime: '15:10' },
  { name: '7교시', startTime: '15:20', endTime: '16:05' },
];

export const COLORS = {
  main: '#F9C4D2',
  sub: '#FDF6F0',
  accent: '#E8899A',
  text: '#333333',
  bg: '#FFFFFF',
  reserved: '#B8E0D2',
  event: '#C9B8E8',
  unavailable: '#E0E0E0',
};

export const STUDENT_RESERVE_START = '07:00';
export const STUDENT_RESERVE_END = '13:10';
```

- [ ] **Step 7: Tailwind 색상 설정 (`tailwind.config.ts` 수정)**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#F9C4D2',
        sub: '#FDF6F0',
        accent: '#E8899A',
        reserved: '#B8E0D2',
        event: '#C9B8E8',
        unavailable: '#E0E0E0',
      },
      fontFamily: {
        sans: ['var(--font-noto)', 'var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 8: 루트 레이아웃 설정 (`src/app/layout.tsx`)**

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansKR = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-noto' });

export const metadata: Metadata = {
  title: 'LibraBook - 도서관 예약 시스템',
  description: '중학교 도서관 수업 시간 예약 및 관리',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} ${notoSansKR.variable} font-sans bg-white text-[#333333]`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 9: 개발 서버 실행 확인**

```bash
npm run dev
```
Expected: `http://localhost:3000` 접속 가능

- [ ] **Step 10: 커밋**

```bash
git init
git add .
git commit -m "chore: initial Next.js project setup with types and constants"
```

---

### Task 2: Google Sheets 클라이언트 구현

**Files:**
- Create: `src/lib/sheets.ts`

- [ ] **Step 1: `src/lib/sheets.ts` 작성**

```typescript
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
```

- [ ] **Step 2: Google Sheets에 시트 헤더 초기화 스크립트 작성**

`scripts/init-sheets.ts` 생성:

```typescript
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
```

- [ ] **Step 3: `package.json`에 스크립트 추가**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "init-sheets": "npx ts-node --project tsconfig.json scripts/init-sheets.ts"
}
```

- [ ] **Step 4: `src/lib/utils.ts` 작성**

```typescript
import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function getCurrentKSTDate(): string {
  // KST = UTC+9
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

export function getCurrentKSTTime(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[1].substring(0, 5); // 'HH:mm'
}

export function isStudentReservationAllowed(): boolean {
  const time = getCurrentKSTTime();
  return time >= '07:00' && time <= '13:10';
}

export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function getDayOfWeekKor(date: Date): string {
  return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
}
```

- [ ] **Step 5: uuid 패키지 설치 및 커밋**

```bash
npm install uuid
npm install -D @types/uuid
git add .
git commit -m "feat: add Google Sheets client and utility functions"
```

---

## Phase 2: 인증 시스템

### Task 3: JWT 인증 API 구현

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: `src/lib/auth.ts` 작성**

```typescript
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { AuthPayload } from '@/types';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = 'librabook_token';

export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
```

- [ ] **Step 2: bcrypt 설치**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 3: `src/app/api/auth/login/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSheetData } from '@/lib/sheets';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import type { User } from '@/types';

function rowToUser(row: string[]): User {
  return {
    id: row[0],
    name: row[1],
    role: row[2] as User['role'],
    subject: row[3],
    studentId: row[4],
    passwordHash: row[5],
    createdAt: row[6],
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { role, password } = body;

  const rows = await getSheetData('users');
  const dataRows = rows.slice(1); // 헤더 제외

  let user: User | undefined;

  if (role === 'admin') {
    user = dataRows.map(rowToUser).find(u => u.role === 'admin');
  } else if (role === 'teacher') {
    const { name, subject } = body;
    user = dataRows.map(rowToUser).find(
      u => u.role === 'teacher' && u.name === name && u.subject === subject
    );
  } else if (role === 'student') {
    const { studentId } = body;
    user = dataRows.map(rowToUser).find(
      u => u.role === 'student' && u.studentId === studentId
    );
  }

  if (!user) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const token = await signToken({ userId: user.id, role: user.role, name: user.name });

  const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8시간
    path: '/',
  });
  return response;
}
```

- [ ] **Step 4: `src/app/api/auth/logout/route.ts` 작성**

```typescript
import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
```

- [ ] **Step 5: `src/middleware.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];
const ADMIN_PATHS = ['/admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (ADMIN_PATHS.some(p => pathname.startsWith(p)) && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/timetable', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 6: 커밋**

```bash
git add .
git commit -m "feat: implement JWT authentication API and middleware"
```

---

### Task 4: 로그인 UI 구현

**Files:**
- Create: `src/components/auth/LoginForm.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/hooks/useAuth.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: `src/hooks/useAuth.ts` 작성**

```typescript
'use client';
import { useState, useEffect } from 'react';
import type { UserRole } from '@/types';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('librabook_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  async function login(body: Record<string, string>) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    const data = await res.json();
    localStorage.setItem('librabook_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('librabook_user');
    setUser(null);
  }

  return { user, loading, login, logout };
}
```

- [ ] **Step 2: `src/components/auth/LoginForm.tsx` 작성**

```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

export default function LoginForm() {
  const [role, setRole] = useState<UserRole>('teacher');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body: Record<string, string> = { role, password };
      if (role === 'teacher') { body.name = name; body.subject = subject; }
      if (role === 'student') { body.studentId = studentId; }
      const user = await login(body);
      router.push(user.role === 'admin' ? '/admin/timetable' : '/timetable');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-[#333333] mb-2">LibraBook</h1>
        <p className="text-center text-sm text-gray-500 mb-6">도서관 예약 시스템</p>

        {/* 역할 선택 탭 */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          {(['teacher', 'student', 'admin'] as UserRole[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                role === r ? 'bg-white shadow text-[#E8899A] font-medium' : 'text-gray-500'
              }`}
            >
              {r === 'teacher' ? '선생님' : r === 'student' ? '학생' : '관리자'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {role === 'teacher' && (
            <>
              <input
                type="text"
                placeholder="이름"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
                required
              />
              <input
                type="text"
                placeholder="과목"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
                required
              />
            </>
          )}
          {role === 'student' && (
            <input
              type="text"
              placeholder="학번"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
              required
            />
          )}
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8899A]"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E8899A] text-white py-3 rounded-lg font-medium hover:bg-[#d4758a] transition-colors disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/app/login/page.tsx` 작성**

```typescript
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return <LoginForm />;
}
```

- [ ] **Step 4: `src/app/page.tsx` 수정 (리다이렉트)**

```typescript
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/timetable');
}
```

- [ ] **Step 5: 브라우저에서 로그인 화면 확인**

```bash
npm run dev
# http://localhost:3000/login 접속 → 역할 탭 전환, 폼 필드 변경 확인
```

- [ ] **Step 6: 커밋**

```bash
git add .
git commit -m "feat: implement login UI with role-based form"
```

---

## Phase 3: 타임테이블 관리

### Task 5: 타임테이블 API 구현

**Files:**
- Create: `src/app/api/timetable/route.ts`
- Create: `src/app/api/timetable/[id]/route.ts`
- Create: `src/app/api/periods/route.ts`

- [ ] **Step 1: `src/app/api/periods/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { DEFAULT_PERIODS } from '@/lib/constants';
import type { Period } from '@/types';

function rowToPeriod(row: string[]): Period {
  return { id: row[0], name: row[1], startTime: row[2], endTime: row[3] };
}

export async function GET() {
  const rows = await getSheetData('periods');
  const periods = rows.slice(1).map(rowToPeriod);
  // 교시가 없으면 기본값 반환
  if (periods.length === 0) {
    return NextResponse.json(DEFAULT_PERIODS.map((p, i) => ({ id: String(i + 1), ...p })));
  }
  return NextResponse.json(periods);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const periods: Omit<Period, 'id'>[] = await req.json();

  // 기존 데이터 전체 교체: 헤더 포함 행 수 확인 후 새로 추가
  const rows = await getSheetData('periods');
  // 기존 데이터 행 삭제는 appendRow 전에 클리어 필요
  // 간단하게: 헤더(row1) 유지, row2부터 overwrite
  for (let i = 0; i < periods.length; i++) {
    const id = generateId();
    const rowIndex = i + 2; // 헤더(1) + 데이터 시작(2)
    if (i < rows.length - 1) {
      await updateRow('periods', rowIndex, [id, periods[i].name, periods[i].startTime, periods[i].endTime]);
    } else {
      await appendRow('periods', [id, periods[i].name, periods[i].startTime, periods[i].endTime]);
    }
  }
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: `src/app/api/timetable/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId, getMonthDays, getDayOfWeekKor } from '@/lib/utils';
import type { TimetableDay } from '@/types';

function rowToDay(row: string[]): TimetableDay {
  return { id: row[0], month: row[1], date: row[2], dayOfWeek: row[3], isHoliday: row[4] === 'true' };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // 'YYYY-MM'
  const rows = await getSheetData('timetable_config');
  let days = rows.slice(1).map(rowToDay);
  if (month) days = days.filter(d => d.month === month);
  return NextResponse.json(days);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { year, month, holidays = [] }: { year: number; month: number; holidays: string[] } = await req.json();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const days = getMonthDays(year, month);

  for (const day of days) {
    const dateStr = day.toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeekKor(day);
    const isHoliday = holidays.includes(dateStr) || day.getDay() === 0 || day.getDay() === 6;
    await appendRow('timetable_config', [generateId(), monthStr, dateStr, dayOfWeek, String(isHoliday)]);
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: `src/app/api/timetable/[id]/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { isHoliday }: { isHoliday: boolean } = await req.json();
  const rows = await getSheetData('timetable_config');
  const rowIndex = rows.findIndex(r => r[0] === params.id);
  if (rowIndex === -1) return NextResponse.json({ error: '없음' }, { status: 404 });

  const row = rows[rowIndex];
  await updateRow('timetable_config', rowIndex + 1, [row[0], row[1], row[2], row[3], String(isHoliday)]);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: 커밋**

```bash
git add .
git commit -m "feat: add timetable and periods API endpoints"
```

---

### Task 6: 예약 API 구현

**Files:**
- Create: `src/app/api/reservations/route.ts`
- Create: `src/app/api/reservations/[id]/route.ts`

- [ ] **Step 1: `src/app/api/reservations/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import type { Reservation } from '@/types';

function rowToReservation(row: string[]): Reservation {
  return {
    id: row[0], date: row[1], periodId: row[2],
    type: row[3] as Reservation['type'],
    teacherId: row[4], className: row[5], grade: row[6],
    purpose: row[7], status: row[8] as Reservation['status'],
    createdAt: row[9], updatedAt: row[10],
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const date = searchParams.get('date');
  const session = await getSession();

  const rows = await getSheetData('reservations');
  let reservations = rows.slice(1).map(rowToReservation).filter(r => r.status !== 'cancelled');

  if (month) reservations = reservations.filter(r => r.date.startsWith(month));
  if (date) reservations = reservations.filter(r => r.date === date);

  // 권한별 정보 필터링
  if (!session) {
    return NextResponse.json(reservations.map(r => ({ id: r.id, date: r.date, periodId: r.periodId, type: r.type, status: r.status })));
  }
  if (session.role === 'student') {
    return NextResponse.json(reservations.map(r => ({ id: r.id, date: r.date, periodId: r.periodId, type: r.type, status: r.status })));
  }
  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'student') {
    return NextResponse.json({ error: '선생님만 수업 예약 가능' }, { status: 403 });
  }

  const body: Omit<Reservation, 'id' | 'status' | 'createdAt' | 'updatedAt'> = await req.json();

  // 이벤트 타입은 관리자만
  if (body.type === 'event' && session.role !== 'admin') {
    return NextResponse.json({ error: '행사 등록은 관리자만 가능' }, { status: 403 });
  }

  // 충돌 확인
  const rows = await getSheetData('reservations');
  const existing = rows.slice(1).map(r => ({
    id: r[0], date: r[1], periodId: r[2], status: r[8],
    teacherId: r[4], className: r[5], grade: r[6], type: r[3],
    name: r[4], // teacherId 대신 실제 이름은 users 시트에서 조회 필요
  })).find(r => r.date === body.date && r.periodId === body.periodId && r.status !== 'cancelled');

  if (existing) {
    return NextResponse.json({
      conflict: true,
      existing: { id: existing.id, teacherId: existing.teacherId, className: existing.className, grade: existing.grade, type: existing.type }
    }, { status: 409 });
  }

  const now = new Date().toISOString();
  const id = generateId();
  await appendRow('reservations', [id, body.date, body.periodId, body.type, session.userId, body.className, body.grade, body.purpose, 'confirmed', now, now]);

  return NextResponse.json({ success: true, id });
}
```

- [ ] **Step 2: `src/app/api/reservations/[id]/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateRow, appendRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const body = await req.json();
  const rows = await getSheetData('reservations');
  const rowIndex = rows.findIndex(r => r[0] === params.id);
  if (rowIndex === -1) return NextResponse.json({ error: '없음' }, { status: 404 });

  const row = rows[rowIndex];
  // 권한 확인: 본인 예약 또는 관리자
  if (session.role !== 'admin' && row[4] !== session.userId) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  // 이력 기록
  const historyId = generateId();
  await appendRow('reservation_history', [historyId, params.id, session.userId, JSON.stringify(row), JSON.stringify(body), new Date().toISOString()]);

  const now = new Date().toISOString();
  await updateRow('reservations', rowIndex + 1, [
    row[0], body.date ?? row[1], body.periodId ?? row[2],
    body.type ?? row[3], row[4], body.className ?? row[5],
    body.grade ?? row[6], body.purpose ?? row[7],
    body.status ?? row[8], row[9], now,
  ]);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const rows = await getSheetData('reservations');
  const rowIndex = rows.findIndex(r => r[0] === params.id);
  if (rowIndex === -1) return NextResponse.json({ error: '없음' }, { status: 404 });

  const row = rows[rowIndex];
  if (session.role !== 'admin' && row[4] !== session.userId) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const now = new Date().toISOString();
  await updateRow('reservations', rowIndex + 1, [
    row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], 'cancelled', row[9], now,
  ]);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: 커밋**

```bash
git add .
git commit -m "feat: add reservation CRUD API with conflict detection"
```

---

## Phase 4: 타임테이블 UI

### Task 7: 타임테이블 그리드 컴포넌트

**Files:**
- Create: `src/components/timetable/TimetableCell.tsx`
- Create: `src/components/timetable/TimetableGrid.tsx`
- Create: `src/hooks/useTimetable.ts`
- Create: `src/app/timetable/page.tsx`

- [ ] **Step 1: `src/hooks/useTimetable.ts` 작성**

```typescript
'use client';
import { useState, useEffect } from 'react';
import type { TimetableDay, Period, Reservation } from '@/types';

export function useTimetable(month: string) {
  const [days, setDays] = useState<TimetableDay[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const [daysRes, periodsRes, reservationsRes] = await Promise.all([
        window.fetch(`/api/timetable?month=${month}`).then(r => r.json()),
        window.fetch('/api/periods').then(r => r.json()),
        window.fetch(`/api/reservations?month=${month}`).then(r => r.json()),
      ]);
      setDays(daysRes);
      setPeriods(periodsRes);
      setReservations(reservationsRes);
      setLoading(false);
    }
    fetch();
  }, [month]);

  function getReservation(date: string, periodId: string) {
    return reservations.find(r => r.date === date && r.periodId === periodId);
  }

  return { days, periods, reservations, loading, getReservation };
}
```

- [ ] **Step 2: `src/components/timetable/TimetableCell.tsx` 작성**

```typescript
'use client';
import type { Reservation } from '@/types';

interface Props {
  date: string;
  periodId: string;
  reservation?: Pick<Reservation, 'id' | 'type' | 'status' | 'className' | 'grade'> & { teacherName?: string };
  isHoliday: boolean;
  onClick?: () => void;
  userRole?: string;
}

const TYPE_COLORS: Record<string, string> = {
  class: 'bg-[#B8E0D2] text-[#333]',
  event: 'bg-[#C9B8E8] text-[#333]',
  'self-study': 'bg-[#F9C4D2] text-[#333]',
};

export default function TimetableCell({ reservation, isHoliday, onClick, userRole }: Props) {
  if (isHoliday) {
    return <div className="h-10 bg-[#E0E0E0] rounded text-xs text-gray-400 flex items-center justify-center">휴일</div>;
  }

  if (!reservation) {
    return (
      <button
        onClick={onClick}
        className="h-10 w-full bg-white border border-gray-100 rounded hover:border-[#E8899A] hover:bg-[#FDF6F0] transition-colors text-xs text-gray-400"
      >
        {userRole === 'teacher' || userRole === 'admin' ? '예약' : ''}
      </button>
    );
  }

  const colorClass = TYPE_COLORS[reservation.type] ?? 'bg-gray-100';
  return (
    <button
      onClick={onClick}
      className={`h-10 w-full rounded text-xs font-medium truncate px-1 ${colorClass}`}
    >
      {reservation.type === 'class' && reservation.grade ? `${reservation.grade}반` : reservation.type === 'event' ? '행사' : '자율'}
    </button>
  );
}
```

- [ ] **Step 3: `src/components/timetable/TimetableGrid.tsx` 작성**

```typescript
'use client';
import TimetableCell from './TimetableCell';
import type { TimetableDay, Period, Reservation } from '@/types';

interface Props {
  days: TimetableDay[];
  periods: Period[];
  getReservation: (date: string, periodId: string) => Reservation | undefined;
  onCellClick?: (date: string, periodId: string, reservation?: Reservation) => void;
  userRole?: string;
}

export default function TimetableGrid({ days, periods, getReservation, onCellClick, userRole }: Props) {
  const weekDays = ['월', '화', '수', '목', '금'];
  // 주차별로 날짜 그룹핑
  const schoolDays = days.filter(d => !['토', '일'].includes(d.dayOfWeek));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-20 p-2 text-left text-gray-500 font-normal text-xs">교시</th>
            {schoolDays.map(d => (
              <th key={d.id} className="p-2 text-center min-w-[80px]">
                <div className="font-medium text-xs text-gray-700">{d.date.slice(5)}</div>
                <div className="text-xs text-gray-400">{d.dayOfWeek}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map(period => (
            <tr key={period.id} className="border-t border-gray-50">
              <td className="p-2">
                <div className="text-xs font-medium text-gray-700">{period.name}</div>
                <div className="text-xs text-gray-400">{period.startTime}</div>
              </td>
              {schoolDays.map(day => {
                const reservation = getReservation(day.date, period.id);
                return (
                  <td key={day.id} className="p-1">
                    <TimetableCell
                      date={day.date}
                      periodId={period.id}
                      reservation={reservation}
                      isHoliday={day.isHoliday}
                      onClick={() => onCellClick?.(day.date, period.id, reservation)}
                      userRole={userRole}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: `src/app/timetable/page.tsx` 작성**

```typescript
'use client';
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import { useTimetable } from '@/hooks/useTimetable';
import { useAuth } from '@/hooks/useAuth';

export default function TimetablePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = format(currentDate, 'yyyy-MM');
  const { days, periods, loading, getReservation } = useTimetable(month);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#FDF6F0]">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#333]">LibraBook</h1>
        <div className="flex items-center gap-4">
          {user && <span className="text-sm text-gray-600">{user.name}</span>}
        </div>
      </header>

      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-2 rounded-lg hover:bg-gray-100">◀</button>
            <h2 className="text-xl font-bold">{format(currentDate, 'yyyy년 M월')}</h2>
            <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-2 rounded-lg hover:bg-gray-100">▶</button>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-[#B8E0D2] rounded">수업</span>
            <span className="px-2 py-1 bg-[#C9B8E8] rounded">행사</span>
            <span className="px-2 py-1 bg-[#F9C4D2] rounded">자율</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">불러오는 중...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <TimetableGrid
              days={days}
              periods={periods}
              getReservation={getReservation}
              userRole={user?.role}
            />
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: date-fns 설치 및 커밋**

```bash
npm install date-fns
git add .
git commit -m "feat: implement timetable grid UI with month navigation"
```

---

## Phase 5: 예약 신청 UI

### Task 8: 예약 신청 모달 및 충돌 협의 UI

**Files:**
- Create: `src/components/reservation/ReservationModal.tsx`
- Create: `src/components/reservation/ConflictModal.tsx`
- Modify: `src/app/timetable/page.tsx`

- [ ] **Step 1: `src/components/reservation/ReservationModal.tsx` 작성**

```typescript
'use client';
import { useState } from 'react';
import type { Period, TimetableDay } from '@/types';

interface Props {
  date: string;
  periodName: string;
  onClose: () => void;
  onSubmit: (data: { className: string; grade: string; purpose: string; type: string }) => Promise<void>;
}

export default function ReservationModal({ date, periodName, onClose, onSubmit }: Props) {
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState('');
  const [purpose, setPurpose] = useState('');
  const [type, setType] = useState('class');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit({ className, grade, purpose, type });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '예약 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold mb-1">수업 예약 신청</h2>
        <p className="text-sm text-gray-500 mb-4">{date} · {periodName}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              placeholder="학년 (예: 2)"
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
              required
            />
            <input
              placeholder="반 (예: 3)"
              value={className}
              onChange={e => setClassName(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
              required
            />
          </div>
          <input
            placeholder="수업 목적"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
            <button type="submit" disabled={loading} className="flex-1 bg-[#E8899A] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#d4758a] disabled:opacity-50">
              {loading ? '처리 중...' : '예약 신청'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/reservation/ConflictModal.tsx` 작성**

```typescript
'use client';
import { useState } from 'react';

interface ConflictInfo {
  id: string;
  teacherId: string;
  className: string;
  grade: string;
  type: string;
}

interface Props {
  conflict: ConflictInfo;
  onClose: () => void;
  onNegotiationComplete: (reservationData: { className: string; grade: string; purpose: string }) => Promise<void>;
}

export default function ConflictModal({ conflict, onClose, onNegotiationComplete }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setLoading(true);
    await onNegotiationComplete({ className, grade, purpose });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-amber-800">이미 예약된 시간입니다</p>
          <p className="text-xs text-amber-600 mt-1">
            기존 예약: {conflict.grade}학년 {conflict.className}반
            ({conflict.type === 'class' ? '수업' : '행사'})
          </p>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          기존 예약자와 협의 후, 협의 완료 시 아래에 체크하고 예약을 신청하세요.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input placeholder="학년" value={grade} onChange={e => setGrade(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]" required />
            <input placeholder="반" value={className} onChange={e => setClassName(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]" required />
          </div>
          <input placeholder="수업 목적" value={purpose} onChange={e => setPurpose(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]" required />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="accent-[#E8899A]" />
            기존 예약자와 협의를 완료했습니다
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">취소</button>
            <button type="submit" disabled={!agreed || loading} className="flex-1 bg-[#E8899A] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {loading ? '처리 중...' : '예약 신청'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/app/timetable/page.tsx`에 예약 모달 통합 (전체 교체)**

```typescript
'use client';
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import ReservationModal from '@/components/reservation/ReservationModal';
import ConflictModal from '@/components/reservation/ConflictModal';
import { useTimetable } from '@/hooks/useTimetable';
import { useAuth } from '@/hooks/useAuth';
import type { Reservation } from '@/types';

export default function TimetablePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = format(currentDate, 'yyyy-MM');
  const { days, periods, loading, getReservation, reload } = useTimetable(month);
  const { user } = useAuth();

  const [selectedCell, setSelectedCell] = useState<{ date: string; periodId: string; periodName: string } | null>(null);
  const [conflict, setConflict] = useState<{ info: Reservation; date: string; periodId: string } | null>(null);

  async function handleCellClick(date: string, periodId: string, existing?: Reservation) {
    if (!user || user.role === 'student') return;
    const period = periods.find(p => p.id === periodId);
    if (existing) return; // 이미 예약된 셀 — 상세 표시는 추후 구현
    setSelectedCell({ date, periodId, periodName: period?.name ?? '' });
  }

  async function handleReserve(data: { className: string; grade: string; purpose: string; type: string }) {
    if (!selectedCell) return;
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, date: selectedCell.date, periodId: selectedCell.periodId }),
    });
    if (res.status === 409) {
      const { existing } = await res.json();
      setSelectedCell(null);
      setConflict({ info: existing, date: selectedCell.date, periodId: selectedCell.periodId });
      return;
    }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    reload?.();
    setSelectedCell(null);
  }

  async function handleConflictResolve(data: { className: string; grade: string; purpose: string }) {
    if (!conflict) return;
    // 기존 예약 취소 후 새 예약 생성
    await fetch(`/api/reservations/${conflict.info.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, type: 'class', date: conflict.date, periodId: conflict.periodId }),
    });
    reload?.();
    setConflict(null);
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0]">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#333]">LibraBook</h1>
        {user && <span className="text-sm text-gray-600">{user.name} ({user.role === 'teacher' ? '선생님' : user.role === 'student' ? '학생' : '관리자'})</span>}
      </header>
      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-2 rounded-lg hover:bg-gray-100">◀</button>
            <h2 className="text-xl font-bold">{format(currentDate, 'yyyy년 M월')}</h2>
            <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-2 rounded-lg hover:bg-gray-100">▶</button>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-[#B8E0D2] rounded">수업</span>
            <span className="px-2 py-1 bg-[#C9B8E8] rounded">행사</span>
            <span className="px-2 py-1 bg-[#F9C4D2] rounded">자율</span>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-10 text-gray-400">불러오는 중...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <TimetableGrid days={days} periods={periods} getReservation={getReservation} onCellClick={handleCellClick} userRole={user?.role} />
          </div>
        )}
      </main>
      {selectedCell && (
        <ReservationModal date={selectedCell.date} periodName={selectedCell.periodName} onClose={() => setSelectedCell(null)} onSubmit={handleReserve} />
      )}
      {conflict && (
        <ConflictModal conflict={conflict.info as any} onClose={() => setConflict(null)} onNegotiationComplete={handleConflictResolve} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: `useTimetable` 훅에 reload 추가 (`src/hooks/useTimetable.ts` 수정)**

```typescript
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { TimetableDay, Period, Reservation } from '@/types';

export function useTimetable(month: string) {
  const [days, setDays] = useState<TimetableDay[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [daysRes, periodsRes, reservationsRes] = await Promise.all([
      fetch(`/api/timetable?month=${month}`).then(r => r.json()),
      fetch('/api/periods').then(r => r.json()),
      fetch(`/api/reservations?month=${month}`).then(r => r.json()),
    ]);
    setDays(daysRes);
    setPeriods(periodsRes);
    setReservations(reservationsRes);
    setLoading(false);
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function getReservation(date: string, periodId: string) {
    return reservations.find(r => r.date === date && r.periodId === periodId);
  }

  return { days, periods, reservations, loading, getReservation, reload: fetchData };
}
```

- [ ] **Step 5: 커밋**

```bash
git add .
git commit -m "feat: implement reservation modal with conflict negotiation UI"
```

---

## Phase 6: 학생 좌석 예약

### Task 9: 좌석 배치도 API + UI

**Files:**
- Create: `src/app/api/seats/route.ts`
- Create: `src/app/api/seat-reservations/route.ts`
- Create: `src/components/reservation/SeatMap.tsx`
- Create: `src/app/reserve/student/page.tsx`

- [ ] **Step 1: `src/app/api/seats/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import type { Seat } from '@/types';

function rowToSeat(row: string[]): Seat {
  return { id: row[0], row: Number(row[1]), col: Number(row[2]), label: row[3], isActive: row[4] === 'true' };
}

export async function GET() {
  const rows = await getSheetData('seats');
  return NextResponse.json(rows.slice(1).filter(r => r[4] === 'true').map(rowToSeat));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }
  const seats: Omit<Seat, 'id'>[] = await req.json();
  for (const seat of seats) {
    await appendRow('seats', [generateId(), String(seat.row), String(seat.col), seat.label, String(seat.isActive)]);
  }
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: `src/app/api/seat-reservations/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId, getCurrentKSTDate, isStudentReservationAllowed } from '@/lib/utils';
import type { SeatReservation } from '@/types';

function rowToSeatRes(row: string[]): SeatReservation {
  return { id: row[0], date: row[1], seatId: row[2], studentId: row[3], purpose: row[4], status: row[5] as SeatReservation['status'], createdAt: row[6] };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? getCurrentKSTDate();
  const session = await getSession();

  const rows = await getSheetData('seat_reservations');
  const reservations = rows.slice(1).map(rowToSeatRes).filter(r => r.date === date && r.status !== 'cancelled');

  if (!session || session.role === 'student') {
    return NextResponse.json(reservations.map(r => ({ id: r.id, seatId: r.seatId, date: r.date })));
  }
  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: '학생만 좌석 예약 가능' }, { status: 403 });
  }
  if (!isStudentReservationAllowed()) {
    return NextResponse.json({ error: '좌석 예약은 07:00~13:10 사이에만 가능합니다.' }, { status: 400 });
  }

  const { seatId, purpose }: { seatId: string; purpose: string } = await req.json();
  const today = getCurrentKSTDate();

  const rows = await getSheetData('seat_reservations');
  const todayReservations = rows.slice(1).map(rowToSeatRes).filter(r => r.date === today && r.status !== 'cancelled');

  // 당일 1좌석 제한
  if (todayReservations.some(r => r.studentId === session.userId)) {
    return NextResponse.json({ error: '당일 좌석은 1개만 예약 가능합니다.' }, { status: 400 });
  }
  // 좌석 중복 확인
  if (todayReservations.some(r => r.seatId === seatId)) {
    return NextResponse.json({ error: '이미 예약된 좌석입니다.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  await appendRow('seat_reservations', [generateId(), today, seatId, session.userId, purpose, 'confirmed', now]);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: `src/components/reservation/SeatMap.tsx` 작성**

```typescript
'use client';
import type { Seat } from '@/types';

interface ReservedSeat { seatId: string }

interface Props {
  seats: Seat[];
  reservedSeats: ReservedSeat[];
  onSeatClick?: (seat: Seat) => void;
  canReserve?: boolean;
}

export default function SeatMap({ seats, reservedSeats, onSeatClick, canReserve }: Props) {
  const maxRow = Math.max(...seats.map(s => s.row), 0);
  const maxCol = Math.max(...seats.map(s => s.col), 0);

  return (
    <div className="inline-block">
      {/* 칠판 */}
      <div className="w-full bg-gray-200 rounded-lg py-2 text-center text-xs text-gray-500 mb-6">앞 (칠판)</div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))` }}>
        {Array.from({ length: maxRow }, (_, rowIdx) =>
          Array.from({ length: maxCol }, (_, colIdx) => {
            const seat = seats.find(s => s.row === rowIdx + 1 && s.col === colIdx + 1);
            if (!seat) return <div key={`${rowIdx}-${colIdx}`} />;
            const isReserved = reservedSeats.some(r => r.seatId === seat.id);
            return (
              <button
                key={seat.id}
                disabled={isReserved || !canReserve}
                onClick={() => !isReserved && canReserve && onSeatClick?.(seat)}
                className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                  isReserved
                    ? 'bg-[#E0E0E0] text-gray-400 cursor-not-allowed'
                    : canReserve
                    ? 'bg-[#B8E0D2] hover:bg-[#9fd4c6] text-gray-700 cursor-pointer'
                    : 'bg-[#B8E0D2] text-gray-700'
                }`}
              >
                {seat.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `src/app/reserve/student/page.tsx` 작성**

```typescript
'use client';
import { useState, useEffect } from 'react';
import SeatMap from '@/components/reservation/SeatMap';
import { useAuth } from '@/hooks/useAuth';
import { isStudentReservationAllowed, getCurrentKSTDate } from '@/lib/utils';
import type { Seat } from '@/types';

export default function StudentReservePage() {
  const { user } = useAuth();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [reservedSeats, setReservedSeats] = useState<{ seatId: string }[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const canReserve = isStudentReservationAllowed() && user?.role === 'student';

  useEffect(() => {
    Promise.all([
      fetch('/api/seats').then(r => r.json()),
      fetch(`/api/seat-reservations?date=${getCurrentKSTDate()}`).then(r => r.json()),
    ]).then(([s, r]) => { setSeats(s); setReservedSeats(r); });
  }, []);

  async function handleReserve() {
    if (!selectedSeat || !purpose) return;
    setLoading(true);
    const res = await fetch('/api/seat-reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId: selectedSeat.id, purpose }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`${selectedSeat.label} 좌석 예약 완료!`);
      setSelectedSeat(null);
      setPurpose('');
      const updated = await fetch(`/api/seat-reservations?date=${getCurrentKSTDate()}`).then(r => r.json());
      setReservedSeats(updated);
    } else {
      setMessage(data.error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      <h1 className="text-xl font-bold mb-2">방과 후 좌석 예약</h1>
      <p className="text-sm text-gray-500 mb-6">{getCurrentKSTDate()} · 예약 가능 시간: 07:00~13:10</p>
      {!canReserve && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">현재 예약 가능 시간이 아닙니다.</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">{message}</div>}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center">
        <SeatMap seats={seats} reservedSeats={reservedSeats} onSeatClick={setSelectedSeat} canReserve={canReserve} />
      </div>
      {selectedSeat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold mb-3">{selectedSeat.label} 좌석 예약</h2>
            <input
              placeholder="이용 목적"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#E8899A]"
            />
            <div className="flex gap-2">
              <button onClick={() => setSelectedSeat(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">취소</button>
              <button onClick={handleReserve} disabled={loading || !purpose} className="flex-1 bg-[#E8899A] text-white rounded-lg py-2 text-sm disabled:opacity-50">예약</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 커밋**

```bash
git add .
git commit -m "feat: implement student seat reservation with SeatMap UI"
```

---

## Phase 7: 관리자 기능

### Task 10: 관리자 타임테이블 설정 페이지

**Files:**
- Create: `src/app/admin/timetable/page.tsx`
- Create: `src/components/admin/TimetableSettings.tsx`

- [ ] **Step 1: `src/components/admin/TimetableSettings.tsx` 작성**

```typescript
'use client';
import { useState } from 'react';
import { DEFAULT_PERIODS } from '@/lib/constants';

interface PeriodInput { name: string; startTime: string; endTime: string }

export default function TimetableSettings() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [holidays, setHolidays] = useState('');
  const [periods, setPeriods] = useState<PeriodInput[]>(DEFAULT_PERIODS);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleGenerateTimetable() {
    setLoading(true);
    const holidayList = holidays.split(',').map(s => s.trim()).filter(Boolean);
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, holidays: holidayList }),
    });
    setMessage(res.ok ? `${year}년 ${month}월 타임테이블 생성 완료` : '오류 발생');
    setLoading(false);
  }

  async function handleSavePeriods() {
    setLoading(true);
    const res = await fetch('/api/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(periods),
    });
    setMessage(res.ok ? '교시 설정 저장 완료' : '오류 발생');
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{message}</div>}

      <section>
        <h2 className="text-lg font-bold mb-4">월 단위 타임테이블 생성</h2>
        <div className="flex gap-3 flex-wrap">
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 w-24 text-sm" placeholder="연도" />
          <input type="number" value={month} onChange={e => setMonth(Number(e.target.value))} min={1} max={12} className="border border-gray-200 rounded-lg px-3 py-2 w-20 text-sm" placeholder="월" />
          <input value={holidays} onChange={e => setHolidays(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[200px] text-sm" placeholder="공휴일 (YYYY-MM-DD, 쉼표 구분)" />
          <button onClick={handleGenerateTimetable} disabled={loading} className="bg-[#E8899A] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">생성</button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4">교시 시간 설정</h2>
        <div className="space-y-2">
          {periods.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={p.name} onChange={e => setPeriods(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="border border-gray-200 rounded-lg px-3 py-2 w-28 text-sm" />
              <input type="time" value={p.startTime} onChange={e => setPeriods(prev => prev.map((x, j) => j === i ? { ...x, startTime: e.target.value } : x))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <span className="text-gray-400">~</span>
              <input type="time" value={p.endTime} onChange={e => setPeriods(prev => prev.map((x, j) => j === i ? { ...x, endTime: e.target.value } : x))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
        </div>
        <button onClick={handleSavePeriods} disabled={loading} className="mt-4 bg-[#E8899A] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">저장</button>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: `src/app/admin/timetable/page.tsx` 작성**

```typescript
import TimetableSettings from '@/components/admin/TimetableSettings';

export default function AdminTimetablePage() {
  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      <h1 className="text-xl font-bold mb-6">타임테이블 관리</h1>
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <TimetableSettings />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add .
git commit -m "feat: admin timetable settings page"
```

---

### Task 11: 관리자 통계 대시보드 + 엑셀 내보내기

**Files:**
- Create: `src/app/api/export/route.ts`
- Create: `src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: `src/app/api/export/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  const rows = await getSheetData('reservations');
  let data = rows.slice(1).filter(r => r[8] !== 'cancelled');
  if (month) data = data.filter(r => r[1].startsWith(month));

  const ws = XLSX.utils.aoa_to_sheet([
    ['ID', '날짜', '교시ID', '유형', '선생님ID', '학년/반', '학년', '목적', '상태', '생성일', '수정일'],
    ...data,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '예약현황');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reservations-${month ?? 'all'}.xlsx"`,
    },
  });
}
```

- [ ] **Step 2: `src/app/admin/dashboard/page.tsx` 작성**

```typescript
'use client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Stats {
  total: number;
  byType: Record<string, number>;
  byPeriod: Record<string, number>;
}

export default function AdminDashboard() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reservations?month=${month}`)
      .then(r => r.json())
      .then((reservations: Array<{ type: string; periodId: string }>) => {
        const byType: Record<string, number> = {};
        const byPeriod: Record<string, number> = {};
        for (const r of reservations) {
          byType[r.type] = (byType[r.type] ?? 0) + 1;
          byPeriod[r.periodId] = (byPeriod[r.periodId] ?? 0) + 1;
        }
        setStats({ total: reservations.length, byType, byPeriod });
        setLoading(false);
      });
  }, [month]);

  function handleExport() {
    window.open(`/api/export?month=${month}`, '_blank');
  }

  const TYPE_LABELS: Record<string, string> = { class: '수업', event: '행사', 'self-study': '자율학습' };

  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">통계 대시보드</h1>
        <button onClick={handleExport} className="bg-[#E8899A] text-white px-4 py-2 rounded-lg text-sm font-medium">엑셀 내보내기</button>
      </div>
      <div className="mb-4">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      {loading ? (
        <div className="text-center py-10 text-gray-400">불러오는 중...</div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold mb-4">총 예약 건수</h2>
            <p className="text-3xl font-bold text-[#E8899A]">{stats.total}건</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold mb-4">유형별 현황</h2>
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex justify-between text-sm py-1">
                <span>{TYPE_LABELS[type] ?? type}</span>
                <span className="font-medium">{count}건</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add .
git commit -m "feat: admin dashboard with stats and Excel export"
```

---

## Phase 8: 알림 시스템

### Task 12: 알림 API + UI

**Files:**
- Create: `src/app/api/notifications/route.ts`
- Create: `src/components/common/Notification.tsx`
- Create: `src/hooks/useNotifications.ts`

- [ ] **Step 1: `src/app/api/notifications/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateRow, appendRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import type { Notification } from '@/types';

function rowToNotification(row: string[]): Notification {
  return { id: row[0], userId: row[1], type: row[2] as Notification['type'], message: row[3], isRead: row[4] === 'true', createdAt: row[5] };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const rows = await getSheetData('notifications');
  const notifications = rows.slice(1).map(rowToNotification)
    .filter(n => n.userId === session.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);
  return NextResponse.json(notifications);
}

export async function POST(req: NextRequest) {
  // 내부 API 전용 (서버사이드에서 호출)
  const body: Omit<Notification, 'id' | 'createdAt'> = await req.json();
  const now = new Date().toISOString();
  await appendRow('notifications', [generateId(), body.userId, body.type, body.message, 'false', now]);
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  // 읽음 처리
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await req.json();
  const rows = await getSheetData('notifications');
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex === -1) return NextResponse.json({ error: '없음' }, { status: 404 });

  const row = rows[rowIndex];
  await updateRow('notifications', rowIndex + 1, [row[0], row[1], row[2], row[3], 'true', row[5]]);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: `src/hooks/useNotifications.ts` 작성**

```typescript
'use client';
import { useState, useEffect } from 'react';
import type { Notification } from '@/types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  async function fetchNotifications() {
    const res = await fetch('/api/notifications');
    if (res.ok) setNotifications(await res.json());
  }

  useEffect(() => {
    fetchNotifications();
    // 30초마다 폴링 (Google Sheets API 제한 고려)
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  async function markAsRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }

  return { notifications, unreadCount, markAsRead, refetch: fetchNotifications };
}
```

- [ ] **Step 3: `src/components/common/Notification.tsx` 작성**

```typescript
'use client';
import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const TYPE_LABELS = { reserved: '예약 완료', conflict: '충돌 발생', negotiation_complete: '협의 완료' };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-lg hover:bg-gray-100">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#E8899A] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 font-medium text-sm">알림</div>
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-gray-400 text-center">알림이 없습니다</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 hover:bg-gray-50 ${!n.isRead ? 'bg-[#FDF6F0]' : ''}`}
                >
                  <div className="font-medium text-xs text-[#E8899A] mb-0.5">{TYPE_LABELS[n.type]}</div>
                  <div className="text-gray-700">{n.message}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('ko-KR')}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 커밋**

```bash
git add .
git commit -m "feat: add notification system with polling"
```

---

## Phase 9: 정기 일정 관리

### Task 13: 정기 일정 API + 관리자 UI

**Files:**
- Create: `src/app/api/schedules/route.ts`
- Create: `src/app/admin/schedule/page.tsx`

- [ ] **Step 1: `src/app/api/schedules/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateRow } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import type { Schedule } from '@/types';

function rowToSchedule(row: string[]): Schedule {
  return { id: row[0], dayOfWeek: row[1], periodId: row[2], type: row[3] as Schedule['type'], assignedTo: row[4], description: row[5], isActive: row[6] === 'true' };
}

export async function GET() {
  const rows = await getSheetData('schedules');
  return NextResponse.json(rows.slice(1).map(rowToSchedule).filter(s => s.isActive));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }
  const body: Omit<Schedule, 'id' | 'isActive'> = await req.json();
  await appendRow('schedules', [generateId(), body.dayOfWeek, body.periodId, body.type, body.assignedTo, body.description, 'true']);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }
  const { id } = await req.json();
  const rows = await getSheetData('schedules');
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex === -1) return NextResponse.json({ error: '없음' }, { status: 404 });
  const row = rows[rowIndex];
  await updateRow('schedules', rowIndex + 1, [row[0], row[1], row[2], row[3], row[4], row[5], 'false']);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: `src/app/admin/schedule/page.tsx` 작성**

```typescript
'use client';
import { useState, useEffect } from 'react';
import type { Schedule, Period } from '@/types';

const DAY_OPTIONS = ['월', '화', '수', '목', '금'];
const TYPE_OPTIONS = [{ value: 'class', label: '수업' }, { value: 'event', label: '행사' }, { value: 'self-study', label: '자율학습' }];

export default function AdminSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [form, setForm] = useState({ dayOfWeek: '월', periodId: '', type: 'class', assignedTo: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/schedules').then(r => r.json()),
      fetch('/api/periods').then(r => r.json()),
    ]).then(([s, p]) => { setSchedules(s); setPeriods(p); if (p.length) setForm(f => ({ ...f, periodId: p[0].id })); });
  }, []);

  async function handleAdd() {
    setLoading(true);
    await fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const updated = await fetch('/api/schedules').then(r => r.json());
    setSchedules(updated);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await fetch('/api/schedules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setSchedules(prev => prev.filter(s => s.id !== id));
  }

  const TYPE_LABELS: Record<string, string> = { class: '수업', event: '행사', 'self-study': '자율학습' };

  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      <h1 className="text-xl font-bold mb-6">정기 일정 관리</h1>
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="font-bold mb-4">새 정기 일정 등록</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            {DAY_OPTIONS.map(d => <option key={d}>{d}</option>)}
          </select>
          <select value={form.periodId} onChange={e => setForm(f => ({ ...f, periodId: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input placeholder="담당자" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="설명" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2" />
        </div>
        <button onClick={handleAdd} disabled={loading} className="mt-3 bg-[#E8899A] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">등록</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-bold mb-4">등록된 정기 일정</h2>
        {schedules.length === 0 ? <p className="text-sm text-gray-400">등록된 일정이 없습니다.</p> : (
          <div className="space-y-2">
            {schedules.map(s => {
              const period = periods.find(p => p.id === s.periodId);
              return (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">{s.dayOfWeek}요일 {period?.name}</span>
                    <span className="text-gray-500 ml-2">{TYPE_LABELS[s.type]} · {s.assignedTo} · {s.description}</span>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add .
git commit -m "feat: admin recurring schedule management"
```

---

## Phase 10: 계정 등록 + 마무리

### Task 14: 첫 예약 시 계정 등록 API

**Files:**
- Create: `src/app/api/users/route.ts`

- [ ] **Step 1: `src/app/api/users/route.ts` 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSheetData, appendRow } from '@/lib/sheets';
import { generateId } from '@/lib/utils';
import type { User } from '@/types';

export async function POST(req: NextRequest) {
  const body: { name: string; role: 'teacher' | 'student'; subject?: string; studentId?: string; password: string } = await req.json();

  const rows = await getSheetData('users');
  // 중복 확인
  const exists = rows.slice(1).some(row => {
    if (body.role === 'teacher') return row[1] === body.name && row[3] === body.subject;
    if (body.role === 'student') return row[4] === body.studentId;
    return false;
  });
  if (exists) {
    return NextResponse.json({ error: '이미 등록된 사용자입니다.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const now = new Date().toISOString();
  await appendRow('users', [generateId(), body.name, body.role, body.subject ?? '', body.studentId ?? '', passwordHash, now]);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: 관리자 초기 계정 생성 스크립트**

`scripts/create-admin.ts` 생성:

```typescript
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
```

- [ ] **Step 3: `package.json`에 스크립트 추가**

```json
"create-admin": "npx ts-node --project tsconfig.json scripts/create-admin.ts"
```

- [ ] **Step 4: Vercel 배포 설정**

`vercel.json` 생성:
```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

- [ ] **Step 5: 최종 커밋 및 빌드 확인**

```bash
npm run build
git add .
git commit -m "feat: user registration API and admin account setup script"
```

---

## 실행 순서 체크리스트

### Google Sheets 초기 설정
1. Google Cloud Console에서 서비스 계정 생성
2. Google Sheets API 활성화
3. 스프레드시트 생성 후 서비스 계정에 편집 권한 부여
4. 9개 시트 수동 생성 (users, timetable_config, periods, reservations, seats, seat_reservations, schedules, notifications, reservation_history)
5. `.env.local` 환경변수 설정
6. `npm run init-sheets` 실행 (헤더 초기화)
7. `npm run create-admin` 실행 (관리자 계정 생성)

### 개발 진행
- Phase 1 → Phase 2 → Phase 3 순서로 진행
- 각 Phase 완료 후 `npm run dev`로 동작 확인
- Phase 10 완료 후 Vercel에 환경변수 설정 후 배포
