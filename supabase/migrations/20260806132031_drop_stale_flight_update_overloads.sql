-- The previous migration added a parameter, which in Postgres creates an
-- OVERLOAD rather than replacing the function. Both versions existed, and the old
-- ones win an exact-argument match — so a 4-argument call from the app would have
-- reached the old dispatch_update_flight, which calls the old 5-argument
-- apply_flight_update, which never sets flight_arrival_is_actual. The new column
-- would have stayed false forever while looking wired up.
--
-- One function per name. Every caller now passes the certainty explicitly, or
-- takes the deliberate default of "this is an estimate".
drop function if exists public.dispatch_update_flight(uuid, timestamptz, text, text);
drop function if exists public.apply_flight_update(uuid, timestamptz, text, text, text);
