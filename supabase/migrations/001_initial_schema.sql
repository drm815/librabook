-- extensions
create extension if not exists "pgcrypto";

-- users
create table if not exists users (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  role          text not null check (role in ('admin','teacher','student')),
  subject       text,
  student_id    text,
  password_hash text not null,
  created_at    timestamptz not null default now()
);
create unique index if not exists users_teacher_unique on users (name, subject) where role = 'teacher';
create unique index if not exists users_student_unique on users (student_id) where role = 'student';

-- periods
create table if not exists periods (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  start_time text not null,
  end_time   text not null
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
  id         text primary key default gen_random_uuid()::text,
  date       text not null,
  period_id  text not null references periods(id),
  type       text not null check (type in ('class','event','self-study')),
  teacher_id text not null references users(id),
  class_name text not null,
  grade      text not null,
  purpose    text not null,
  status     text not null default 'confirmed' check (status in ('confirmed','pending','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reservations_date_idx on reservations (date);
create index if not exists reservations_month_idx on reservations (left(date, 7));

-- seats
create table if not exists seats (
  id        text primary key default gen_random_uuid()::text,
  row       int not null,
  col       int not null,
  label     text not null,
  is_active boolean not null default true,
  unique (row, col)
);

-- seat_reservations
create table if not exists seat_reservations (
  id         text primary key default gen_random_uuid()::text,
  date       text not null,
  seat_id    text not null references seats(id),
  student_id text not null references users(id),
  purpose    text not null,
  status     text not null default 'confirmed' check (status in ('confirmed','pending','cancelled')),
  created_at timestamptz not null default now()
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
  id         text primary key default gen_random_uuid()::text,
  user_id    text not null references users(id),
  type       text not null check (type in ('reserved','conflict','negotiation_complete')),
  message    text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id);

-- reservation_history
create table if not exists reservation_history (
  id             text primary key default gen_random_uuid()::text,
  reservation_id text not null references reservations(id),
  changed_by     text not null references users(id),
  old_data       jsonb,
  new_data       jsonb,
  changed_at     timestamptz not null default now()
);
