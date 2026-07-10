-- Maintenance days: planned days the machine will sit idle (industry off
-- days), entered per report. Added as flat calendar days on top of the
-- hours-derived due date for every part, since idle time pushes every
-- part's countdown back by the same amount.
alter table service_reports add column if not exists maintenance_days integer not null default 0;
