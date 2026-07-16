-- Fix: deleting a customer cascades customers -> services (on delete cascade,
-- see 0001), but services -> service_reports.service_id had no cascade rule,
-- so Postgres rejected the services delete with a foreign key violation
-- whenever a service had filed reports. Result: customers with zero service
-- reports deleted fine; customers with real service history failed with a
-- generic "Failed to delete customer" alert (see CustomerDetail.tsx).
--
-- The customer delete confirm dialog already promises this cascades to
-- "machines and service reports" (0013), so make the FK match that promise.

alter table service_reports drop constraint if exists service_reports_service_id_fkey;
alter table service_reports
  add constraint service_reports_service_id_fkey
  foreign key (service_id) references services(id) on delete cascade;
