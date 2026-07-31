-- Hourly payment-reminder trigger, hosted in Postgres itself — no dependency
-- on the web host's scheduler. pg_cron fires at :05 past each hour, pg_net
-- makes the HTTP call, the website route does the finding/sending/marking.
-- (Applied to project wbslrmxwbwzswydwdxyi via MCP on 2026-07-31; the
-- cron_secret value in app_config is REDACTED in this copy.)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

select cron.schedule(
  'payment-reminders-hourly',
  '5 * * * *',
  $$
  select net.http_get(
    url := 'https://pixierides.com/api/cron/payment-reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select value from public.app_config where key = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- insert into public.app_config (key, value) values ('cron_secret', '<REDACTED>');
