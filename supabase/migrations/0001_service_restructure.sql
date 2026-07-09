-- Prime Pneumatics — Customer/Service/Service Report restructure
-- ============================================================
-- Verified against the live schema on 2026-07-09 via direct Postgres
-- connection (information_schema, pg_policies, pg_constraint). Corrections
-- made from that inspection, vs. the first draft written blind from app code:
--   - customers.spare_part_ids is jsonb (default '[]'::jsonb), not uuid[] —
--     services.spare_part_ids now matches that type.
--   - RLS on `services` UPDATE is now admin-only via is_admin(), matching the
--     real "Admin can update customers" policy and the adminOnly Service Edit
--     route — the first draft had this wide open to any authenticated user.
--   - Legacy FAB-number backfill placeholder changed from `LEGACY-<id>` to
--     `LEGACY<id>` (no hyphen) to satisfy the alphanumeric check constraint;
--     the report-linking step now matches that same pattern.
--   - customers.spares (free text) and service_reports.checklist (jsonb) are
--     pre-existing dead columns, unused by any current app code — left
--     untouched by this migration, not part of this restructure's scope.
--   - Live row counts at inspection time: customers=5, service_reports=2,
--     spare_parts=3, service_types=6. Small enough that the legacy backfill
--     is easy to hand-verify after running this.
--
-- Still review before running — this is destructive (drops columns/a table)
-- and not reversible without a backup. Recommended: dry-run / transaction in
-- the SQL Editor first, or `supabase db push --dry-run`.
--
-- What this does, in order:
--   1. Create service_part_type enum
--   2. Create `services` table (the new machine entity)
--   3. Create `service_machine_parts` (4 live rows per service)
--   4. Add new columns to `service_reports`, backfill a legacy Service per
--      existing customer + link existing reports to it
--   5. Create `service_report_parts` (frozen per-report snapshot)
--   6. Drop obsolete columns from `service_reports` and `customers`
--   7. Drop `service_types` (pricing concept removed)
--   8. RLS policies for the new tables, matched to the live project's actual
--      conventions (is_admin() for admin-gated writes, open authenticated
--      read/insert elsewhere, no update/delete where the equivalent existing
--      table has none).
-- ============================================================


-- 1. Enum for the 4 fixed spare part types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'service_part_type') then
    create type service_part_type as enum ('air_filter', 'oil_filter', 'separator', 'rotary_oil');
  end if;
end $$;


-- 2. services (machine) table
-- fab_number/model_number are constrained to plain alphanumeric (no spaces,
-- hyphens or other punctuation) to match the frontend's input filtering.
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  fab_number text not null check (fab_number ~ '^[A-Za-z0-9]+$'),
  model_number text check (model_number is null or model_number ~ '^[A-Za-z0-9]+$'),
  assigned_engineer text,
  sponsor text,
  spare_part_ids jsonb not null default '[]'::jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists services_fab_number_key on services (fab_number);
create index if not exists services_customer_id_idx on services (customer_id);

alter table services enable row level security;

-- matches customers' real RLS: open read/insert to any authenticated user,
-- update restricted to admin (customers uses an inline EXISTS check for this;
-- services uses the project's existing is_admin() helper, same effect).
drop policy if exists "services_select_authenticated" on services;
create policy "services_select_authenticated" on services for select to authenticated using (true);
drop policy if exists "services_insert_authenticated" on services;
create policy "services_insert_authenticated" on services for insert to authenticated with check (true);
drop policy if exists "services_update_admin" on services;
create policy "services_update_admin" on services for update to authenticated using (is_admin());


-- 3. service_machine_parts — live, carried-forward state, 4 rows per service
create table if not exists service_machine_parts (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  part_type service_part_type not null,
  hours_run numeric not null default 0,
  next_hours numeric not null default 0,
  hours_per_day integer not null default 24 check (hours_per_day in (12, 24)),
  updated_at timestamptz not null default now(),
  unique (service_id, part_type)
);

create index if not exists service_machine_parts_service_id_idx on service_machine_parts (service_id);

alter table service_machine_parts enable row level security;

-- stays open to any authenticated user (not admin-only): this table is
-- written by ReportNew.tsx when any engineer files a report, not just admins.
drop policy if exists "smp_select_authenticated" on service_machine_parts;
create policy "smp_select_authenticated" on service_machine_parts for select to authenticated using (true);
drop policy if exists "smp_insert_authenticated" on service_machine_parts;
create policy "smp_insert_authenticated" on service_machine_parts for insert to authenticated with check (true);
drop policy if exists "smp_update_authenticated" on service_machine_parts;
create policy "smp_update_authenticated" on service_machine_parts for update to authenticated using (true);


-- 4. service_reports: add new columns first (additive, safe)
alter table service_reports add column if not exists service_id uuid references services(id);
alter table service_reports add column if not exists total_run_hours numeric;
alter table service_reports add column if not exists serviced_by text;
alter table service_reports add column if not exists due_service_date date;

-- backfill total_run_hours from the old hours_run column, if present
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'service_reports' and column_name = 'hours_run') then
    update service_reports set total_run_hours = hours_run where total_run_hours is null;
  end if;
end $$;

-- backfill due_service_date from the old next_service_date column, if present
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'service_reports' and column_name = 'next_service_date') then
    update service_reports set due_service_date = next_service_date where due_service_date is null;
  end if;
end $$;

-- create one legacy Service per existing customer, carrying forward
-- model/assigned_engineer/spare_part_ids, so no existing data is orphaned.
-- fab_number is required going forward but did not exist before this
-- migration — these get a LEGACY<id> placeholder (alphanumeric, no hyphen,
-- to satisfy the check constraint above) and MUST be corrected to the real
-- FAB number per machine via the new Service Edit screen after this runs.
-- model_number is carried over with punctuation/whitespace stripped since
-- the old `model` column was free text and may not have been alphanumeric —
-- review these after migrating, some may need re-entering.
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'customers' and column_name = 'model') then
    insert into services (customer_id, fab_number, model_number, assigned_engineer, spare_part_ids, created_by, created_at)
    select
      c.id,
      'LEGACY' || substr(replace(c.id::text, '-', ''), 1, 8),
      nullif(regexp_replace(coalesce(c.model, ''), '[^A-Za-z0-9]', '', 'g'), ''),
      coalesce(eng.name, eng.phone),
      coalesce(c.spare_part_ids, '[]'::jsonb),
      c.created_by,
      c.created_at
    from customers c
    left join profiles eng on eng.id = c.assigned_engineer_id
    where not exists (select 1 from services s where s.customer_id = c.id);
  end if;
end $$;

-- seed the 4 fixed spare-part rows for every service that doesn't have them yet
insert into service_machine_parts (service_id, part_type, hours_run, next_hours, hours_per_day)
select s.id, pt.part_type, 0, 0, 24
from services s
cross join (select unnest(enum_range(null::service_part_type)) as part_type) pt
where not exists (
  select 1 from service_machine_parts smp
  where smp.service_id = s.id and smp.part_type = pt.part_type
);
-- NOTE: next_hours defaults to 0 for every backfilled part — these are
-- placeholders. Real per-machine thresholds (e.g. air filter / oil filter /
-- separator / rotary oil replacement hours) must be set via the Service Edit
-- screen; I don't have Prime Pneumatics' actual threshold values to fill in.

-- link existing reports to their customer's legacy service
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'service_reports' and column_name = 'customer_id') then
    update service_reports sr
    set service_id = s.id
    from services s
    where s.customer_id = sr.customer_id
      and sr.service_id is null
      and s.fab_number like 'LEGACY%';
  end if;
end $$;


-- 5. service_report_parts — frozen per-report snapshot, 4 rows per report
create table if not exists service_report_parts (
  id uuid primary key default gen_random_uuid(),
  service_report_id uuid not null references service_reports(id) on delete cascade,
  part_type service_part_type not null,
  hours_run numeric not null,
  next_hours numeric not null,
  hours_per_day integer not null check (hours_per_day in (12, 24)),
  remaining_hours numeric not null,
  due_date date not null,
  unique (service_report_id, part_type)
);

create index if not exists service_report_parts_report_id_idx on service_report_parts (service_report_id);

alter table service_report_parts enable row level security;

drop policy if exists "srp_select_authenticated" on service_report_parts;
create policy "srp_select_authenticated" on service_report_parts for select to authenticated using (true);
drop policy if exists "srp_insert_authenticated" on service_report_parts;
create policy "srp_insert_authenticated" on service_report_parts for insert to authenticated with check (true);
-- deliberately no update policy: report snapshots are frozen once written


-- 6. Drop obsolete columns
-- ---- service_reports ----
-- Only drop customer_id once every row has a service_id, so we never silently
-- lose the link. Check this SELECT returns 0 before proceeding:
--   select count(*) from service_reports where service_id is null;
do $$
begin
  if not exists (select 1 from service_reports where service_id is null) then
    alter table service_reports drop column if exists customer_id;
    alter table service_reports alter column service_id set not null;
  end if;
end $$;

alter table service_reports drop column if exists hours_run;
alter table service_reports drop column if exists hours_until_next;
alter table service_reports drop column if exists maintenance_days;
alter table service_reports drop column if exists selected_services;
alter table service_reports drop column if exists total_amount;
alter table service_reports drop column if exists spares_cost;
alter table service_reports drop column if exists next_service_date;
alter table service_reports drop column if exists fab;

-- ---- customers ----
alter table customers drop column if exists model;
alter table customers drop column if exists assigned_engineer_id;
alter table customers drop column if exists spare_part_ids;


-- 7. service_types — pricing/"Services Performed" concept removed entirely
drop table if exists service_types;
