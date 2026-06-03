create table if not exists schedules (
  id text primary key,
  date date not null,
  region text not null,
  venue text not null,
  address text not null default '',
  class_name text not null,
  time text not null,
  coach_name text not null default '',
  is_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (date, region, venue)
);

create table if not exists schedule_classes (
  id text primary key,
  schedule_id text not null references schedules(id) on delete cascade,
  lane text not null,
  name text not null,
  class_time text not null,
  coach_name text not null default '',
  seat_status text not null default '',
  booking_status text not null default '',
  is_open boolean not null default true,
  is_coach_checked boolean not null default false,
  checked_at timestamptz,
  cancellation_reason text,
  cancelled_at timestamptz,
  unique (schedule_id, lane)
);

create table if not exists schedule_changes (
  id text primary key,
  schedule_id text not null references schedules(id) on delete cascade,
  previous_coach text not null default '',
  new_coach text not null default '',
  changed_at timestamptz not null default now(),
  notified boolean not null default false
);

create index if not exists schedule_classes_schedule_id_idx on schedule_classes(schedule_id);
create index if not exists schedule_changes_schedule_id_idx on schedule_changes(schedule_id);

alter table schedules enable row level security;
alter table schedule_classes enable row level security;
alter table schedule_changes enable row level security;

drop policy if exists "allow all on schedules" on schedules;
create policy "allow all on schedules"
  on schedules for all using (true) with check (true);

drop policy if exists "allow all on schedule_classes" on schedule_classes;
create policy "allow all on schedule_classes"
  on schedule_classes for all using (true) with check (true);

drop policy if exists "allow all on schedule_changes" on schedule_changes;
create policy "allow all on schedule_changes"
  on schedule_changes for all using (true) with check (true);
