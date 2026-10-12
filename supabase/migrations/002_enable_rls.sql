-- 모든 테이블에 행수준 보안(RLS) 활성화
-- 서버사이드에서 service_role_key로 접근하므로 RLS는 우회되지만,
-- anon/authenticated 키 노출 시 보안을 위해 기본 정책을 deny-all로 설정

alter table users              enable row level security;
alter table periods            enable row level security;
alter table timetable_config   enable row level security;
alter table reservations       enable row level security;
alter table seats              enable row level security;
alter table seat_reservations  enable row level security;
alter table schedules          enable row level security;
alter table notifications      enable row level security;
alter table reservation_history enable row level security;

-- service_role은 RLS를 우회하므로 별도 정책 불필요.
-- anon/authenticated 접근은 모두 차단 (서버 API를 통해서만 접근)
-- 필요 시 아래 주석을 해제하여 특정 역할에 읽기 권한 부여 가능

-- 예시: 인증된 사용자에게 periods 읽기 허용
-- create policy "periods_read" on periods
--   for select to authenticated using (true);
