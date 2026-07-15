-- Add a free-text Size field to the spare parts catalog (e.g. "1/2 inch",
-- "M10 x 1.5", "DN25"), managed alongside Code and Name on the admin
-- Spare Parts page.
alter table spare_parts add column if not exists size text;
