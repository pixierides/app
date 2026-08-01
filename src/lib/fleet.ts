/**
 * The fleet. A driver picks their car from this list; the composed
 * "label · plate" string is what the customer is told to look for, so an
 * entry without a plate is incomplete on purpose rather than a fake one.
 */
import { supabase } from './supabase';

export type Vehicle = {
  id: string;
  label: string;
  plate: string | null;
};

/** "White Chevy Suburban · FL 8XK-221" — matches vehicle_label() server-side. */
export function vehicleLabel(v: Vehicle | null | undefined): string {
  if (!v) return '';
  return v.plate?.trim() ? `${v.label} · ${v.plate.trim()}` : v.label;
}

export async function listVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, label, plate')
    .eq('active', true)
    .order('label', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Vehicle[];
}

export async function setMyVehicle(vehicleId: string | null): Promise<void> {
  const { error } = await supabase.rpc('driver_set_vehicle', { p_vehicle_id: vehicleId });
  if (error) throw error;
}
