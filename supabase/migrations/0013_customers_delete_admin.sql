-- Admins can now delete a customer from the Customer Detail page. Deleting a
-- customer cascades to their services (services.customer_id ... on delete
-- cascade, see 0001) and in turn to service_reports, removing all of that
-- customer's machines and service history. Add an admin-only DELETE policy,
-- matching the existing `services_update_admin` pattern.

alter table customers enable row level security;

drop policy if exists "customers_delete_admin" on customers;
create policy "customers_delete_admin" on customers for delete to authenticated using (is_admin());
