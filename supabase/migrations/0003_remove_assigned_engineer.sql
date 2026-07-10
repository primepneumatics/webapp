-- assigned_engineer on services was a free-text label, never used for
-- access control, and is being dropped in favor of not tracking a
-- per-service engineer at all. serviced_by on service_reports (who
-- actually filed a given report) is unrelated and stays.
alter table services drop column if exists assigned_engineer;
