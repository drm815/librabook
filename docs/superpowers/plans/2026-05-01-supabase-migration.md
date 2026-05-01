# Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google Sheets DB를 Supabase(PostgreSQL)로 교체하고, 자체 JWT 인증은 그대로 유지한다.

**Architecture:** `src/lib/sheets.ts`를 `src/lib/supabase.ts`로 교체해 Supabase 클라이언트를 제공하고, 모든 API route에서 `getSheetData`/`appendRow`/`updateRow` 패턴을 Supabase SDK의 타입-세이프 쿼리로 전면 교체한다. `generateId()`(uuid) 대신 PostgreSQL의 `gen_random_uuid()` DEFAULT를 활용하고, rowIndex 기반 업데이트를 `id` 기반 upsert로 바꾼다.

**Tech Stack:** `@supabase/supabase-js`, PostgreSQL(Supabase), Next.js API Routes, JWT(jose, 유지)

---

## File Structure

```
수정:
  src/lib/sheets.ts           → 삭제
  src/lib/supabase.ts         → 신규: Supabase 클라이언트 싱글턴
  supabase/migrations/
    001_initial_schema.sql    → 신규: 9개 테이블 DDL + 인덱스
  scripts/init-sheets.ts      → scripts/seed-admin.ts 로 교체
  .env.local                  → SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 추가
  src/app/api/auth/login/route.ts
  src/app/api/users/route.ts
  src/app/api/timetable/route.ts
  src/app/api/timetable/[id]/route.ts
  src/app/api/periods/route.ts
  src/app/api/reservations/route.ts
  src/app/api/reservations/[id]/route.ts
  src/app/api/seats/route.ts
  src/app/api/seat-reservations/route.ts
  src/app/api/schedules/route.ts
  src/app/api/notifications/route.ts
  src/app/api/export/route.ts
  package.json
```

---

## Task 1: 패키지 설치 및 환경변수 설정

**Files:**
- Modify: `package.json`
- Modify: `.env.local`
- Modify: `.env.example`

- [ ] **Step 1: `@supabase/supabase-js` 설치**

```bash
npm install @supabase/supabase-js
```

Expected: `package.json`의 dependencies에 `@supabase/supabase-js` 추가됨

- [ ] **Step 2: `.env.local`에 Supabase 환경변수 추가**

`.env.local` 파일에 아래 두 줄 추가 (기존 Google Sheets 변수는 삭제):

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

> Supabase 대시보드 → Project Settings → API → Project URL / service_role key

- [ ] **Step 3: `.env.example` 업데이트**

`.env.example` 전체를 아래로 교체:

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 4: 커밋**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: install @supabase/supabase-js and update env vars"
```

---

## Task 2: Supabase 스키마(DDL) 작성

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: migrations 디렉토리 생성 및 DDL 파일 작성**

```bash
mkdir -p supabase/migrations
```

`supabase/migrations/001_initial_schema.sql` 생성:

```sql
-- extensions
create extension if not exists "pgcrypto";

-- users
create table if not exists users (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  role        text not null check (role in ('admin','teacher','student')),
  subject     text,
  student_id  text,
  password_hash text not null,
  created_at  timestamptz not null default now()
);
create unique index if not exists users_teacher_unique on users (name, subject) where role = 'teacher';
create unique index if not exists users_student_unique on users (student_id) where role = 'student';

-- periods
create table if not exists periods (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  start_time  text not null,
  end_time    text not null
);

-- timetable_config
create table if not exists timetable_config (
  id          text primary key default gen_random_uuid()::text,
  month       text not null,
  date        text not null unique,
  day_of_week text not null,
  is_holiday  boolean not null default false
);
create index if not exists timetable_config_month_idx on timetable_config (month);

-- reservations
create table if not exists reservations (
  id          text primary key default gen_random_uuid()::text,
  date        text not null,
  period_id   text not null references periods(id),
  type        text not null check (type in ('class','event','self-study')),
  teacher_id  text not null references users(id),
  class_name  text not null,
  grade       text not null,
  purpose     text not null,
  status      text not null default 'confirmed' check (status in ('confirmed','pending','cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists reservations_date_idx on reservations (date);
create index if not exists reservations_month_idx on reservations (left(date, 7));

-- seats
create table if not exists seats (
  id          text primary key default gen_random_uuid()::text,
  row         int not null,
  col         int not null,
  label       text not null,
  is_active   boolean not null default true,
  unique (row, col)
);

-- seat_reservations
create table if not exists seat_reservations (
  id          text primary key default gen_random_uuid()::text,
  date        text not null,
  seat_id     text not null references seats(id),
  student_id  text not null references users(id),
  purpose     text not null,
  status      text not null default 'confirmed' check (status in ('confirmed','pending','cancelled')),
  created_at  timestamptz not null default now()
);
create index if not exists seat_reservations_date_idx on seat_reservations (date);

-- schedules
create table if not exists schedules (
  id          text primary key default gen_random_uuid()::text,
  day_of_week text not null,
  period_id   text not null references periods(id),
  type        text not null check (type in ('class','event','self-study')),
  assigned_to text not null,
  description text not null,
  is_active   boolean not null default true
);

-- notifications
create table if not exists notifications (
  id          text primary key default gen_random_uuid()::text,
  user_id     text not null references users(id),
  type        text not null check (type in ('reserved','conflict','negotiation_complete')),
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id);

-- reservation_history
create table if not exists reservation_history (
  id              text primary key default gen_random_uuid()::text,
  reservation_id  text not null references reservations(id),
  changed_by      text not null references users(id),
  old_data        jsonb,
  new_data        jsonb,
  changed_at      timestamptz not null default now()
);
```

> 이 SQL을 Supabase 대시보드 → SQL Editor에서 실행하거나 `supabase db push`로 적용한다.

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add Supabase PostgreSQL schema migration"
```

---

## Task 3: `src/lib/supabase.ts` 작성 및 `sheets.ts` 제거

**Files:**
- Create: `src/lib/supabase.ts`
- Delete: `src/lib/sheets.ts`

- [ ] **Step 1: `src/lib/supabase.ts` 작성**

```typescript
import { createClient } from '@supabase/supabase-js';

// service role key: 서버사이드 전용, RLS 우회
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

- [ ] **Step 2: `src/lib/sheets.ts` 삭제**

```bash
rm /Users/binzzang/development/timetable_lib/src/lib/sheets.ts
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/supabase.ts src/lib/sheets.ts
git commit -m "feat: add Supabase client, remove Google Sheets client"
```

---

## Task 4: 인증 API 교체 (`auth/login`, `users`)

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/users/route.ts`

- [ ] **Step 1: `src/app/api/auth/login/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { role, password } = body;

  let query = supabase.from('users').select('*').eq('role', role);

  if (role === 'admin') {
    // admin은 role만으로 조회
  } else if (role === 'teacher') {
    query = query.eq('name', body.name).eq('subject', body.subject);
  } else if (role === 'student') {
    query = query.eq('student_id', body.studentId);
  } else {
    return NextResponse.json({ error: '잘못된 역할' }, { status: 400 });
  }

  const { data, error } = await query.limit(1).single();

  if (error || !data) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, data.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const token = await signToken({ userId: data.id, role: data.role, name: data.name });

  const response = NextResponse.json({
    success: true,
    user: { id: data.id, name: data.name, role: data.role },
  });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
  return response;
}
```

- [ ] **Step 2: `src/app/api/users/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body: {
    name: string;
    role: 'teacher' | 'student';
    subject?: string;
    studentId?: string;
    password: string;
  } = await req.json();

  // 중복 확인
  let dupQuery = supabase.from('users').select('id').eq('role', body.role);
  if (body.role === 'teacher') {
    dupQuery = dupQuery.eq('name', body.name).eq('subject', body.subject ?? '');
  } else {
    dupQuery = dupQuery.eq('student_id', body.studentId ?? '');
  }
  const { data: existing } = await dupQuery.limit(1).single();
  if (existing) {
    return NextResponse.json({ error: '이미 등록된 사용자입니다.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const { error } = await supabase.from('users').insert({
    name: body.name,
    role: body.role,
    subject: body.subject ?? null,
    student_id: body.studentId ?? null,
    password_hash: passwordHash,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/auth/login/route.ts src/app/api/users/route.ts
git commit -m "feat: migrate auth and user API to Supabase"
```

---

## Task 5: 타임테이블 API 교체 (`timetable`, `periods`)

**Files:**
- Modify: `src/app/api/timetable/route.ts`
- Modify: `src/app/api/timetable/[id]/route.ts`
- Modify: `src/app/api/periods/route.ts`

- [ ] **Step 1: `src/app/api/timetable/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { getMonthDays, getDayOfWeekKor } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  let query = supabase
    .from('timetable_config')
    .select('*')
    .order('date', { ascending: true });

  if (month) query = query.eq('month', month);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    data.map(r => ({
      id: r.id,
      month: r.month,
      date: r.date,
      dayOfWeek: r.day_of_week,
      isHoliday: r.is_holiday,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { year, month, holidays = [] }: { year: number; month: number; holidays: string[] } =
    await req.json();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const days = getMonthDays(year, month);

  const rows = days.map(day => {
    const dateStr = day.toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeekKor(day);
    const isHoliday =
      holidays.includes(dateStr) || day.getDay() === 0 || day.getDay() === 6;
    return { month: monthStr, date: dateStr, day_of_week: dayOfWeek, is_holiday: isHoliday };
  });

  // upsert: 같은 date가 있으면 is_holiday만 갱신
  const { error } = await supabase
    .from('timetable_config')
    .upsert(rows, { onConflict: 'date' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: `src/app/api/timetable/[id]/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { id } = await params;
  const { isHoliday }: { isHoliday: boolean } = await req.json();

  const { error } = await supabase
    .from('timetable_config')
    .update({ is_holiday: isHoliday })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: `src/app/api/periods/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { DEFAULT_PERIODS } from '@/lib/constants';

export async function GET() {
  const { data, error } = await supabase
    .from('periods')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) {
    return NextResponse.json(
      DEFAULT_PERIODS.map((p, i) => ({ id: String(i + 1), ...p }))
    );
  }

  return NextResponse.json(
    data.map(r => ({ id: r.id, name: r.name, startTime: r.start_time, endTime: r.end_time }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const periods: { name: string; startTime: string; endTime: string }[] = await req.json();

  // 기존 전체 삭제 후 재삽입 (교시 순서 관리)
  await supabase.from('periods').delete().neq('id', '');

  const { error } = await supabase.from('periods').insert(
    periods.map(p => ({ name: p.name, start_time: p.startTime, end_time: p.endTime }))
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/timetable/route.ts src/app/api/timetable/\[id\]/route.ts src/app/api/periods/route.ts
git commit -m "feat: migrate timetable and periods API to Supabase"
```

---

## Task 6: 예약 API 교체 (`reservations`, `reservations/[id]`)

**Files:**
- Modify: `src/app/api/reservations/route.ts`
- Modify: `src/app/api/reservations/[id]/route.ts`

- [ ] **Step 1: `src/app/api/reservations/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const date = searchParams.get('date');
  const session = await getSession();

  let query = supabase
    .from('reservations')
    .select('*')
    .neq('status', 'cancelled')
    .order('date', { ascending: true });

  if (month) query = query.like('date', `${month}%`);
  if (date) query = query.eq('date', date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reservations = data.map(r => ({
    id: r.id,
    date: r.date,
    periodId: r.period_id,
    type: r.type,
    teacherId: r.teacher_id,
    className: r.class_name,
    grade: r.grade,
    purpose: r.purpose,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  if (!session || session.role === 'student') {
    return NextResponse.json(
      reservations.map(r => ({ id: r.id, date: r.date, periodId: r.periodId, type: r.type, status: r.status }))
    );
  }
  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'student') {
    return NextResponse.json({ error: '선생님만 수업 예약 가능' }, { status: 403 });
  }

  const body: {
    date: string;
    periodId: string;
    type: string;
    className: string;
    grade: string;
    purpose: string;
  } = await req.json();

  if (body.type === 'event' && session.role !== 'admin') {
    return NextResponse.json({ error: '행사 등록은 관리자만 가능' }, { status: 403 });
  }

  // 충돌 확인
  const { data: existing } = await supabase
    .from('reservations')
    .select('id, teacher_id, class_name, grade, type')
    .eq('date', body.date)
    .eq('period_id', body.periodId)
    .neq('status', 'cancelled')
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json(
      {
        conflict: true,
        existing: {
          id: existing.id,
          teacherId: existing.teacher_id,
          className: existing.class_name,
          grade: existing.grade,
          type: existing.type,
        },
      },
      { status: 409 }
    );
  }

  const { data: inserted, error } = await supabase
    .from('reservations')
    .insert({
      date: body.date,
      period_id: body.periodId,
      type: body.type,
      teacher_id: session.userId,
      class_name: body.className,
      grade: body.grade,
      purpose: body.purpose,
      status: 'confirmed',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: inserted.id });
}
```

- [ ] **Step 2: `src/app/api/reservations/[id]/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { data: existing, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: '없음' }, { status: 404 });
  }
  if (session.role !== 'admin' && existing.teacher_id !== session.userId) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  // 이력 기록
  await supabase.from('reservation_history').insert({
    reservation_id: id,
    changed_by: session.userId,
    old_data: existing,
    new_data: body,
  });

  const { error } = await supabase
    .from('reservations')
    .update({
      date: body.date ?? existing.date,
      period_id: body.periodId ?? existing.period_id,
      type: body.type ?? existing.type,
      class_name: body.className ?? existing.class_name,
      grade: body.grade ?? existing.grade,
      purpose: body.purpose ?? existing.purpose,
      status: body.status ?? existing.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await params;

  const { data: existing, error: fetchError } = await supabase
    .from('reservations')
    .select('teacher_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: '없음' }, { status: 404 });
  }
  if (session.role !== 'admin' && existing.teacher_id !== session.userId) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/reservations/route.ts src/app/api/reservations/\[id\]/route.ts
git commit -m "feat: migrate reservations API to Supabase"
```

---

## Task 7: 좌석 API 교체 (`seats`, `seat-reservations`)

**Files:**
- Modify: `src/app/api/seats/route.ts`
- Modify: `src/app/api/seat-reservations/route.ts`

- [ ] **Step 1: `src/app/api/seats/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  const { data, error } = await supabase
    .from('seats')
    .select('*')
    .eq('is_active', true)
    .order('row', { ascending: true })
    .order('col', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    data.map(r => ({ id: r.id, row: r.row, col: r.col, label: r.label, isActive: r.is_active }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const seats: { row: number; col: number; label: string; isActive: boolean }[] =
    await req.json();

  const { error } = await supabase.from('seats').insert(
    seats.map(s => ({ row: s.row, col: s.col, label: s.label, is_active: s.isActive }))
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: `src/app/api/seat-reservations/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { getCurrentKSTDate, isStudentReservationAllowed } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? getCurrentKSTDate();
  const session = await getSession();

  const { data, error } = await supabase
    .from('seat_reservations')
    .select('*')
    .eq('date', date)
    .neq('status', 'cancelled');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!session || session.role === 'student') {
    return NextResponse.json(data.map(r => ({ id: r.id, seatId: r.seat_id, date: r.date })));
  }
  return NextResponse.json(
    data.map(r => ({
      id: r.id,
      date: r.date,
      seatId: r.seat_id,
      studentId: r.student_id,
      purpose: r.purpose,
      status: r.status,
      createdAt: r.created_at,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: '학생만 좌석 예약 가능' }, { status: 403 });
  }
  if (!isStudentReservationAllowed()) {
    return NextResponse.json(
      { error: '좌석 예약은 07:00~13:10 사이에만 가능합니다.' },
      { status: 400 }
    );
  }

  const { seatId, purpose }: { seatId: string; purpose: string } = await req.json();
  const today = getCurrentKSTDate();

  // 당일 1좌석 제한
  const { data: myReservation } = await supabase
    .from('seat_reservations')
    .select('id')
    .eq('date', today)
    .eq('student_id', session.userId)
    .neq('status', 'cancelled')
    .limit(1)
    .single();

  if (myReservation) {
    return NextResponse.json({ error: '당일 좌석은 1개만 예약 가능합니다.' }, { status: 400 });
  }

  // 좌석 중복 확인
  const { data: seatTaken } = await supabase
    .from('seat_reservations')
    .select('id')
    .eq('date', today)
    .eq('seat_id', seatId)
    .neq('status', 'cancelled')
    .limit(1)
    .single();

  if (seatTaken) {
    return NextResponse.json({ error: '이미 예약된 좌석입니다.' }, { status: 409 });
  }

  const { error } = await supabase.from('seat_reservations').insert({
    date: today,
    seat_id: seatId,
    student_id: session.userId,
    purpose,
    status: 'confirmed',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/seats/route.ts src/app/api/seat-reservations/route.ts
git commit -m "feat: migrate seats and seat-reservations API to Supabase"
```

---

## Task 8: 스케줄·알림·내보내기 API 교체

**Files:**
- Modify: `src/app/api/schedules/route.ts`
- Modify: `src/app/api/notifications/route.ts`
- Modify: `src/app/api/export/route.ts`

- [ ] **Step 1: `src/app/api/schedules/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('is_active', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    data.map(r => ({
      id: r.id,
      dayOfWeek: r.day_of_week,
      periodId: r.period_id,
      type: r.type,
      assignedTo: r.assigned_to,
      description: r.description,
      isActive: r.is_active,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const body: {
    dayOfWeek: string;
    periodId: string;
    type: string;
    assignedTo: string;
    description: string;
  } = await req.json();

  const { error } = await supabase.from('schedules').insert({
    day_of_week: body.dayOfWeek,
    period_id: body.periodId,
    type: body.type,
    assigned_to: body.assignedTo,
    description: body.description,
    is_active: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { id } = await req.json();
  const { error } = await supabase
    .from('schedules')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: `src/app/api/notifications/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    data.map(r => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      message: r.message,
      isRead: r.is_read,
      createdAt: r.created_at,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body: { userId: string; type: string; message: string } = await req.json();

  const { error } = await supabase.from('notifications').insert({
    user_id: body.userId,
    type: body.type,
    message: body.message,
    is_read: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await req.json();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', session.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: `src/app/api/export/route.ts` 전체 교체**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  let query = supabase
    .from('reservations')
    .select('*')
    .neq('status', 'cancelled')
    .order('date', { ascending: true });

  if (month) query = query.like('date', `${month}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ws = XLSX.utils.aoa_to_sheet([
    ['ID', '날짜', '교시ID', '유형', '선생님ID', '학년/반', '학년', '목적', '상태', '생성일', '수정일'],
    ...data.map(r => [
      r.id, r.date, r.period_id, r.type, r.teacher_id,
      r.class_name, r.grade, r.purpose, r.status, r.created_at, r.updated_at,
    ]),
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

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/schedules/route.ts src/app/api/notifications/route.ts src/app/api/export/route.ts
git commit -m "feat: migrate schedules, notifications, and export API to Supabase"
```

---

## Task 9: 불필요한 의존성 제거 및 스크립트 정리

**Files:**
- Modify: `package.json`
- Delete: `scripts/init-sheets.ts`
- Modify: `scripts/create-admin.ts`

- [ ] **Step 1: Google Sheets 관련 패키지 제거**

```bash
npm uninstall googleapis google-auth-library
```

- [ ] **Step 2: `scripts/init-sheets.ts` 삭제**

```bash
rm scripts/init-sheets.ts
```

- [ ] **Step 3: `scripts/create-admin.ts` 전체 교체 (Supabase 기반으로)**

```typescript
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
    id: 'admin-001',
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
```

- [ ] **Step 4: `package.json` scripts에서 `init-sheets` 제거, `create-admin` 유지 확인**

`package.json`의 scripts 섹션:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "create-admin": "npx ts-node --project tsconfig.json scripts/create-admin.ts"
}
```

- [ ] **Step 5: 빌드 확인**

```bash
node node_modules/next/dist/bin/next build
```

Expected: 빌드 성공, 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json scripts/create-admin.ts
git rm scripts/init-sheets.ts
git commit -m "chore: remove Google Sheets dependencies, update scripts for Supabase"
```

---

## 실행 순서 체크리스트 (Supabase 설정)

1. Supabase 대시보드에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/001_initial_schema.sql` 실행
3. `.env.local`에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 입력
4. `npm run create-admin` 실행
5. `npm run dev` 로컬 확인
6. Vercel 환경변수에 동일 값 설정 후 배포
