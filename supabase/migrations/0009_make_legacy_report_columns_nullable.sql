-- service_reports still carries several pre-restructure columns that
-- migration 0001 intended to drop but never actually ran on this
-- database, leaving them NOT NULL. The current app never sets them,
-- so every new report insert fails with a 400. Make them nullable
-- (not dropped) so the one real un-migrated historical report (#21,
-- service_id null) keeps its data intact. Dropping them for good is a
-- separate follow-up once that history is backfilled or confirmed
-- safe to discard.
alter table service_reports alter column customer_id drop not null;
alter table service_reports alter column checklist drop not null;
alter table service_reports alter column fab drop not null;
alter table service_reports alter column hours_run drop not null;
alter table service_reports alter column hours_until_next drop not null;
alter table service_reports alter column spares_cost drop not null;
alter table service_reports alter column next_service_date drop not null;
alter table service_reports alter column selected_services drop not null;
alter table service_reports alter column total_amount drop not null;
