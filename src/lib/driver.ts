/**
 * Driver-owned state: which car, and whether they're on shift.
 * Shift status informs dispatch; it never blocks an assignment.
 */
import { supabase } from './supabase';

export async function setMyShift(onShift: boolean): Promise<void> {
  const { error } = await supabase.rpc('driver_set_shift', { p_on: onShift });
  if (error) throw error;
}
