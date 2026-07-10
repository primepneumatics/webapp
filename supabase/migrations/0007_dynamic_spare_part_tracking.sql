-- Spare-part hour tracking (Air Filter / Oil Filter / Oil Separator /
-- Rotary Oil) stops being a fixed 4-value enum and becomes dynamic,
-- driven by the same spare_parts master list already used for the
-- "Spare Parts Used" log. Any spare part can now be added to a
-- machine/report's hour-tracking list, not just the original 4.
--
-- Confirmed no real report data exists yet (test data only), so this is
-- a clean schema swap, not a value-preserving migration: existing
-- service_machine_parts / service_report_parts rows (keyed by the old
-- enum) are cleared rather than remapped.

-- seed the original 4 wear parts into spare_parts as real, reusable rows
insert into spare_parts (code, name, price_per_unit)
select v.code, v.name, v.price_per_unit
from (values
  ('AIRFLT', 'Air Filter', 0),
  ('OILFLT', 'Oil Filter', 0),
  ('OILSEP', 'Oil Separator', 0),
  ('ROTOIL', 'Rotary Oil', 0)
) as v(code, name, price_per_unit)
where not exists (select 1 from spare_parts sp where sp.code = v.code);

truncate table service_report_parts;
truncate table service_machine_parts;

alter table service_machine_parts drop constraint if exists service_machine_parts_service_id_part_type_key;
alter table service_machine_parts drop column if exists part_type;
alter table service_machine_parts add column spare_part_id uuid references spare_parts(id);
alter table service_machine_parts alter column spare_part_id set not null;
alter table service_machine_parts add constraint service_machine_parts_service_id_spare_part_id_key unique (service_id, spare_part_id);

alter table service_report_parts drop constraint if exists service_report_parts_service_report_id_part_type_key;
alter table service_report_parts drop column if exists part_type;
alter table service_report_parts add column spare_part_id uuid references spare_parts(id);
alter table service_report_parts alter column spare_part_id set not null;
alter table service_report_parts add constraint service_report_parts_service_report_id_spare_part_id_key unique (service_report_id, spare_part_id);

drop type if exists service_part_type;
