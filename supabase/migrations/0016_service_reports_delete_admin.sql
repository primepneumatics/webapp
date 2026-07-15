-- Admins can now delete a filed service report from the Service Report view.
-- Deleting a report cascades to its line items
-- (service_report_parts.service_report_id ... on delete cascade, see 0001).
-- Add an admin-only DELETE policy, matching the existing
-- `customers_delete_admin` pattern from 0013.

alter table service_reports enable row level security;

drop policy if exists "service_reports_delete_admin" on service_reports;
create policy "service_reports_delete_admin" on service_reports for delete to authenticated using (is_admin());
