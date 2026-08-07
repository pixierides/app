-- trips.source told dispatch every booking came from the web, because
-- ingest_web_booking hardcoded it. Dispatch's contact affordances branch on that
-- column: a web customer has to be reached by phone or email, an app customer
-- can be pushed to once push exists. So every app booking claiming 'web' means
-- dispatch would never offer push to someone holding the app.
--
-- The submission now carries its own origin, in the same structured-column style
-- as the other booking_* fields — never parsed back out of the message string.
alter table public.contact_submissions
  add column if not exists booking_source text;

comment on column public.contact_submissions.booking_source is
  'Where the booking came from: ''app'', or null/anything else for the website. Read by ingest_web_booking into trips.source.';

-- Patch the single hardcoded value in place rather than restating 5KB of
-- plpgsql, which would risk a transcription error in logic that is working.
-- Verified beforehand that this substring occurs exactly once.
do $$
declare
  def text;
  patched text;
begin
  select pg_get_functiondef(oid) into def
  from pg_proc where proname = 'ingest_web_booking';

  patched := replace(
    def,
    '(v_ref, ''web'',',
    -- Unknown values fall back to 'web' deliberately: claiming 'app' wrongly
    -- would have dispatch offer push to someone who cannot receive it, whereas
    -- claiming 'web' wrongly only costs a phone call.
    '(v_ref, case when new.booking_source = ''app'' then ''app'' else ''web'' end::public.trip_source,');

  if patched = def then
    raise exception 'ingest_web_booking: source literal not found, nothing patched';
  end if;

  execute patched;
end $$;
