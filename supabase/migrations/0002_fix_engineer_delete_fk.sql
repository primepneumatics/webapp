-- Fix: deleting an engineer profile was silently blocked by foreign keys
-- with no ON DELETE behavior (default NO ACTION). Any engineer who had
-- created a customer, added a machine, or filed a report could never be
-- deleted — the DB rejected it, and api/admin-users.ts swallowed the first
-- failure and showed a generic error on the second.
--
-- Fix: SET NULL on delete, so history is preserved (who created/filed
-- something just becomes unknown) instead of blocking the delete entirely.
-- Matches how customers.assigned_engineer_id behaved before it was dropped.

alter table customers drop constraint if exists customers_created_by_fkey;
alter table customers add constraint customers_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table service_reports drop constraint if exists service_reports_created_by_fkey;
alter table service_reports add constraint service_reports_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table service_reports drop constraint if exists service_reports_filed_by_id_fkey;
alter table service_reports add constraint service_reports_filed_by_id_fkey
  foreign key (filed_by_id) references profiles(id) on delete set null;

alter table services drop constraint if exists services_created_by_fkey;
alter table services add constraint services_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;
