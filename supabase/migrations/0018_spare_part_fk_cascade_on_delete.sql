-- Same bug class as 0017: spare_parts could not be deleted once actually in
-- use, because service_machine_parts.spare_part_id and
-- service_report_parts.spare_part_id (added in 0007) had no cascade rule,
-- so Postgres rejected the delete with a foreign key violation. Unused
-- spare parts deleted fine; the 4 default parts (attached to every service)
-- and any part actually assigned to a machine could not be deleted at all.
--
-- service_machine_parts is live/current-state tracking, so cascading here is
-- correct: deleting a spare part from the catalog should remove it from
-- every machine's tracking list. service_report_parts is a frozen snapshot
-- of a filed report, but deleting a spare part it references means the
-- catalog entry no longer exists — cascade for consistency, matching the
-- 0017 precedent for this table's other FKs.

alter table service_machine_parts drop constraint if exists service_machine_parts_spare_part_id_fkey;
alter table service_machine_parts
  add constraint service_machine_parts_spare_part_id_fkey
  foreign key (spare_part_id) references spare_parts(id) on delete cascade;

alter table service_report_parts drop constraint if exists service_report_parts_spare_part_id_fkey;
alter table service_report_parts
  add constraint service_report_parts_spare_part_id_fkey
  foreign key (spare_part_id) references spare_parts(id) on delete cascade;
