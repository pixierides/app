-- A trip whose car has failed is not unassigned-and-fine, and it is not
-- cancelled: it is waiting for a replacement with the clock running.
--
-- The value lives in its own migration because ALTER TYPE ... ADD VALUE
-- cannot share a transaction with anything that uses the new value; the
-- state itself (columns, functions, guards) follows in the next one.
alter type public.trip_status add value if not exists 'reassigning' after 'driver_assigned';
