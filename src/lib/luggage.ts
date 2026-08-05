/**
 * Luggage reference data for the size guide.
 *
 * SOURCE: pixieweb — bag dimensions from app/luggage-size-guide/GuideContent.tsx,
 * capacity tiers from lib/data.ts (`capacityTiers`, also read by the fleet page
 * and the FAQ). If the fleet changes, these four capacity numbers change in BOTH
 * repos.
 *
 * Deliberately a copy rather than a fetch, unlike the rate table. Prices move
 * and a stale price is a commercial problem, so those are fetched. These are the
 * physical shape of the fleet and of standard airline bags — they change when we
 * buy a different van, not weekly — and the guide's whole job is to be readable
 * at a check-in desk on bad airport wifi. A size guide that needs the network is
 * a size guide that fails exactly when it is opened.
 *
 * Dimensions are inches INCLUDING wheels, handles and corner caps — measured the
 * way airlines measure, which is the entire reason the guide exists.
 */

export type Bag = {
  key: string;
  name: string;
  /** Width, depth, height in inches, accessories included. */
  w: number;
  d: number;
  h: number;
  /** How the airline treats it. */
  fliesAs: string;
  wheels: boolean;
};

export const BAGS: Bag[] = [
  { key: 'cosmetic', name: '12″ cosmetic case', w: 12.2, d: 6.7, h: 12.6, fliesAs: 'Personal item', wheels: false },
  { key: 'carryon', name: '20″ carry-on', w: 14.6, d: 9.1, h: 22.4, fliesAs: 'Carry on', wheels: true },
  { key: 'checked', name: '28″ checked large', w: 20.1, d: 12.4, h: 30.3, fliesAs: 'Checked large', wheels: true },
];

/** "20.1 × 12.4 × 30.3" */
export const bagDims = (b: Bag) => `${b.w} × ${b.d} × ${b.h}`;

export type CapacityTier = { vehicle: string; guests: number; bags: number };

/**
 * How many 28″ checked bags fit, by how many seats are filled. Both rows for a
 * vehicle are true of the same vehicle — bag room depends on the guest count.
 */
export const CAPACITY: CapacityTier[] = [
  { vehicle: 'Premium SUV', guests: 4, bags: 6 },
  { vehicle: 'Premium SUV', guests: 6, bags: 4 },
  { vehicle: 'Transit van', guests: 10, bags: 10 },
  { vehicle: 'Transit van', guests: 12, bags: 8 },
];

/**
 * Strollers aren't a bag size, so they're prose rather than a row in the size
 * table — but they decide the vehicle, so they belong in the guide.
 */
export const STROLLER_NOTES: { lead: string; rest: string }[] = [
  { lead: 'Folded single stroller', rest: '— counts as one 28″ checked bag, plus a little.' },
  { lead: 'Double or jogging stroller', rest: '— needs the van; tell us when you book.' },
];
