-- Hrs/Day was a fixed 12-or-24 dropdown; it's now a free numeric field,
-- so replace the check restricting it to those two values with a
-- simple sanity check (must be a positive number, since it's a divisor
-- in the days-remaining calculation).
alter table service_machine_parts drop constraint if exists service_machine_parts_hours_per_day_check;
alter table service_machine_parts add constraint service_machine_parts_hours_per_day_check check (hours_per_day > 0);

alter table service_report_parts drop constraint if exists service_report_parts_hours_per_day_check;
alter table service_report_parts add constraint service_report_parts_hours_per_day_check check (hours_per_day > 0);
