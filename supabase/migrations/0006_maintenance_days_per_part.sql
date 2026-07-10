-- Maintenance days turned out to be per spare part, not one flat value
-- per report (0005). Move the column from service_reports to the
-- per-part snapshot table instead.
alter table service_reports drop column if exists maintenance_days;
alter table service_report_parts add column if not exists maintenance_days integer not null default 0;
