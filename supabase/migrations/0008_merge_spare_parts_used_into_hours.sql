-- Spare Item Hours and Spare Parts Used were two separate dynamic
-- add-from-dropdown lists drawing from the same spare_parts catalog.
-- Merge them: every part tracked on a report now also records how many
-- were used that visit, so a separate "used" list is no longer needed.
alter table service_report_parts add column if not exists qty integer not null default 1;
alter table service_reports drop column if exists selected_spares;
