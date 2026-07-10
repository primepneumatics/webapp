-- Price/rate per spare part was never used for any pricing or billing
-- calculation (reports only track quantity and hour-based wear), so the
-- field is dead weight on the admin form. Drop it from the catalog table.
alter table spare_parts drop column if exists price_per_unit;
