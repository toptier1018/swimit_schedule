alter table schedule_classes
add column if not exists student_supplies jsonb not null default '[]'::jsonb;
