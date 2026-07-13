-- Engineers can now add a new customer from the Search Reports page
-- (previously admin-only at the frontend route level). Add a permissive
-- INSERT policy for any authenticated user, matching the existing
-- `services_insert_authenticated` pattern from 0001 — RLS policies for the
-- same command/role are OR'd together, so this is safe to add regardless
-- of whatever insert policy already exists on `customers` (admin-only or
-- otherwise) without needing to know/drop its name.

alter table customers enable row level security;

drop policy if exists "customers_insert_authenticated" on customers;
create policy "customers_insert_authenticated" on customers for insert to authenticated with check (true);
