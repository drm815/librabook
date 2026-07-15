-- 도서부 학생 관리 테이블
create table if not exists library_members (
  id         text primary key default gen_random_uuid()::text,
  student_id text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table library_members enable row level security;
