-- Prevent duplicate spare part codes. Nothing previously enforced this —
-- the app uppercases the code before insert/update, but a unique index was
-- never added, so two rows with the same code could exist. Verified via a
-- REST query against the live table on 2026-07-23: all 12 existing rows
-- have distinct codes, so this is safe to apply without a backfill.
-- Case-insensitive (upper(code)) since the DB itself doesn't guarantee the
-- app's uppercasing step is always honored (e.g. a direct SQL insert).

create unique index if not exists spare_parts_code_upper_key on spare_parts (upper(code));
