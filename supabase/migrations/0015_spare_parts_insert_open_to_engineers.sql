-- Engineers can now add a new spare part from the Spare Parts page
-- (previously admin-only at the frontend route level; editing/deleting an
-- existing spare part remains admin-only in the UI). Add a permissive
-- INSERT policy for any authenticated user, matching the existing
-- `customers_insert_authenticated` pattern from 0012 — RLS policies for the
-- same command/role are OR'd together, so this is safe to add regardless of
-- whatever insert policy already exists on `spare_parts` (admin-only or
-- otherwise) without needing to know/drop its name.

alter table spare_parts enable row level security;

drop policy if exists "spare_parts_insert_authenticated" on spare_parts;
create policy "spare_parts_insert_authenticated" on spare_parts for insert to authenticated with check (true);
