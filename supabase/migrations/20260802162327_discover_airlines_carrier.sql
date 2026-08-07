-- Discover Airlines (4Y, the Lufthansa leisure carrier) flies FRA-MCO daily
-- and was missing from the foreign-carrier list.
create or replace function public.is_foreign_carrier(p_flight text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    substring(upper(regexp_replace(coalesce(p_flight, ''), '[^A-Za-z0-9]', '', 'g'))
              from '^[A-Z0-9]{2,3}')
    in (
      'AC', 'WS', 'TS', 'PD', 'F8',
      'BA', 'VS', 'TOM', 'BY', 'EI',
      'LH', '4Y', 'DE', 'AF', 'KL', 'LX', 'IB', 'UX', 'AZ', 'SK', 'DY', 'LO', 'TP',
      'CM', 'AV', 'LA', 'AM', 'Y4', 'VB', 'BW',
      'EK', 'QR', 'TK'
    ), false);
$$;
