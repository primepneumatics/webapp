-- "Spares Required" let admins pick a subset of the spare_parts catalog
-- per machine. Every machine now always tracks the same fixed 4 wear
-- parts (service_machine_parts / service_part_type enum), so the
-- free-form selection is redundant. spare_parts itself and
-- service_reports.selected_spares (actual parts consumed per visit)
-- are unrelated and stay.
alter table services drop column if exists spare_part_ids;
