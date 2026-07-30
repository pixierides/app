# Pixie Rides app — handover brief

Read this before opening the bundle. It takes two minutes and covers the
things that are not obvious from the files.

---

## What this is

A design handoff for the Pixie Rides mobile app: 123 wireframe screens, two
clickable prototypes, a design system, and a written spec.

**No app code exists yet.** This is the specification, not a codebase.

## Authoritative source

**`README.md` and nothing else.**

| File | Status |
|---|---|
| `README.md` | ✅ Authoritative. Start here. |
| `designs/Pixie App Wireframes.dc.html` | ✅ Current — turns 53–70 |
| `designs/Pixie Arrival Night - Prototype.dc.html` | ✅ 17 screens, the customer spine |
| `designs/Pixie Flight Delayed - Prototype.dc.html` | ✅ 9 screens |
| `designs/Pixie App - Audit v2.dc.html` | ✅ Read the "still open" section |
| `designs/Pixie App Wireframes - Archive turns 1-52.dc.html` | ❌ Rejected directions. Do not build from it. |
| `PRODUCT_RULES.md` | ❌ Retired. The file explains why. |

If two documents disagree, `README.md` wins.

---

## ⚠️ Known gap in the bundle — read this

The README refers to 18 component source files:

```
components/forms/Button.jsx, Input.jsx, IncludedRow.jsx
components/data/Card.jsx, Badge.jsx, ListRow.jsx, PriceDisplay.jsx, RouteChip.jsx
components/brand/Logo.jsx, NameSign.jsx, LightTrail.jsx
components/feedback/TripStatus.jsx
components/navigation/TabBar.jsx
ui_kits/mobile-app/AppShell.jsx, HomeScreen.jsx, QuoteScreen.jsx,
                    TripScreen.jsx, DriverHereScreen.jsx
```

**None of these files are in the bundle.** No `.d.ts` or `.prompt.md` either.

**They are recoverable.** All 18 are compiled into
`designs/_ds/pixie-rides-design-system-<uuid>/_ds_bundle.js`, which is
unminified and readable (~1,650 lines, average 32 chars). Extract from there
rather than rebuilding from screenshots — the button size/variant matrix and
the tick geometry in `IncludedRow` are worth copying exactly.

**Do not assume the bundle is throwaway build output.** It is currently the
only copy of the component source.

Token files DO exist, at:
`designs/_ds/pixie-rides-design-system-<uuid>/tokens/*.css`
(the README's paths omit the UUID folder).

---

## Build order — this is deliberate

1. **Design system + auth.** Tokens, primitives, the shared sign-in, role routing.
2. **Driver surfaces** — `36a`, `63a`, `63b`, `63c`, `29a`, `30a`.
3. **Customer spine** — the 17 prototype screens.
4. **The two edges you cannot launch without** — flight delayed, and the
   cancellation/change policy.
5. **Dispatch** — `68a`–`68c`.

**Driver goes before customer on purpose.** Smallest scope, no money, no
payment logic — and it is the half that strands a family at midnight if it
breaks. A customer with a broken app is annoyed; a driver with a broken app
leaves people at an airport.

**Explicitly v1.1+, do not build now:** cruise port, group booking, the
two-driver compliment, wrong-number recovery, saved places, photos from your
driver, left-item reporting, shift summaries.

---

## One app, three roles

```
role: 'customer' | 'driver' | 'dispatch'
```

Every sign-up is `customer`. Driver and dispatch are assigned manually by the
operator against a known mobile number. No self-service path to either.

**Role resolves server-side. This is a security boundary, not a UI
convention.** A driver's run list must not *contain* fares — not hidden, not
filtered client-side, absent from the response. Drivers are salaried; they must
never see what the company charges.

`32a`/`32b` are drawn as a separate driver sign-in. **Do not build them
separately** — same flow, different destination after the code is accepted.

---

## Open decisions — please raise these, do not guess

### 1. Verify the phone number before or after the request — BLOCKING

Currently specced as: form → submit → wall screen → enter mobile again →
code → see request.

The alternative: form → contact details → code → submit → the request is
already theirs.

The second is fewer steps and deletes the wall screen (`64b`), the entire
turn-67 claim-by-phone failure set, and unclaimed requests as a routine path —
which is most of what the dispatch queue exists to handle.

**This changes both the auth flow and the request pipeline. Settle it before
building either.**

### 2. No-show has a policy but no screens

Settled: if the customer does not appear within the included wait time
(60 min airport, 15 min elsewhere), the booking is a no-show and is
non-refundable.

Nothing is designed. Needs a driver-side "customer did not appear" action,
dispatch visibility, and a customer-facing message.

### 3. Payment does not exist on the website either

The web flow currently sends a payment link in the confirmation email. There is
no payment page. The app spec assumes payment at confirmation with a 20-minute
driver hold — that will be the first place payment is actually built.

### 4. Dispatch surface

Drawn in a phone frame for canvas consistency. `68a`'s queue works on a phone;
`68b`'s attempt log with two parallel contact routes does not. Decide whether
dispatch is a compressed phone layout or a responsive web surface in the same
codebase.

---

## Things that will look like bugs but are not

- **No countdown timers anywhere.** Deadlines are formatted dates and times,
  including the 20-minute driver hold — `26a` reads "holding your driver until
  10:16pm", never a ticking clock. This is deliberate.
- **Never a disabled button.** Show the action that IS available. The booking
  detail is three distinct states (`72a`/`72b`/`72c`), not one screen with
  greyed-out controls. The only correct disabled primary is the `72d` consent
  box.
- **15 vs 20 minutes are different numbers.** 15 = how long a human takes to
  confirm. 20 = how long the driver is held while the customer pays. Never
  merge them.
- **The hold starts at claim, not confirm.** Someone who cannot see the pay
  screen is not ignoring it.

---

## The app is an addition, not a replacement

The website continues to take bookings and stays first-class. Consequences:

- **Email is required**, not optional. Confirmations, receipts and
  driver-assigned notices go by email for web-booked customers.
- **Push cannot be the only channel.** `10b` is currently reachable only from
  a push; non-app customers need the same information by email.
- **Do not gate anything behind the install.** Give the driver's photo in the
  email. Let the app offer what email cannot — live position, push, one-tap
  rebooking.

Airport transfers are booked once or twice a year. An install is a real ask and
many will decline. Ask when the value is closest — at driver assignment, ~24h
out — not at confirmation.

---

## Policy — matches the live website exactly

| | |
|---|---|
| Cancellation | Free until 48h before pickup **time**. Inside 48h non-refundable, cancel not offered. |
| Changes | Free until 2 hours before pickup. Closer, phone only. |
| Confirmation | Within the hour. Group quotes within 2 hours. |
| Waiting | 60 min free on airport pickups, 15 min elsewhere. |
| No-show | Non-refundable. |
| Price | Final. Never changes after the availability check. |

Any screen still saying "15 minutes to confirm" or "free waiting however long
it takes" is out of date and must be corrected.

---

## Fidelity

The `designs/` files are **HTML design references, not production code.**
Recreate them in the target codebase using its own patterns.

Colours, typography, spacing, radii and shadows are final. **The copy is
final** — it has been audited twice and the exact wording carries product
meaning.

Two exceptions, both deliberately low-fidelity:
- Maps are abstract SVGs. Use the platform map SDK; keep the light-trail
  styling as the visual language.
- Photos are grey placeholder blocks.

---

## Questions

Raise anything in "Open decisions" rather than picking a default. Decision 1
in particular will silently get built the current way if nobody asks.
