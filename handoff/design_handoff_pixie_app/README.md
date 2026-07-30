# Handoff: Pixie Rides — one app, three roles

## Architecture

**One app. One codebase. One design system.** Not a client app and a driver app — a single product whose surfaces are determined by the signed-in user's role.

```
role: 'customer' | 'driver' | 'dispatch'
```

- **Every new sign-up is `customer`.** No exceptions, no selection at sign-up, no role picker anywhere in the UI.
- **`driver` and `dispatch` are assigned manually** by the operator against a known mobile number. There is no self-service path to either.
- **Role is a single value.** A driver does not also book rides; that case is handled operationally, outside the product.

### Role resolves on the server — this is a security boundary, not a UI convention

With two separate apps, "never a price on a driver screen" could be guaranteed at build time. With one app it cannot, so the guarantee moves to the API.

**The server shapes the payload by role. It does not send data the client then hides.**

- A driver's run list must not *contain* fares, payouts, or customer pricing. Not hidden, not `display:none`, not filtered in the component — absent from the response.
- Dispatch payloads *do* carry money. That is correct and intentional (dispatch takes payment).
- Route guards on role are a convenience for the user, never the control. Assume the client is hostile.

One client-side bug or one manipulated local state is the difference between a working rule and a broken one. Enforce it once, server-side.

### Sign-in is identical for everyone

Enter mobile → six-digit SMS code → in. Same two screens (`33a`, `33b`) for all three roles. The number determines the role; the user never chooses.

After the code is accepted, route by role:

| role | lands on |
|---|---|
| `customer` | Home / trips |
| `driver` | Tonight's runs (`36a`) |
| `dispatch` | Unclaimed queue (`68a`) |

`32a`/`32b` in the canvas are drawn as a separate driver sign-in. **Do not build them as separate screens** — they are the same flow with a different destination.

---

## Build this first

The canvas holds 123 screens across 73 turns. **That is a design record, not a v1.**

**Start here:** `designs/Pixie Arrival Night - Prototype.dc.html` — 17 clickable screens, the whole customer spine in one artifact.

1. **Design system + auth.** Tokens, primitives, the shared sign-in, role routing.
2. **Driver surfaces** (`36a`, `63a`, `63b`, `63c`, `29a`, `30a`). Smallest scope, no money, no payment logic — and the half that has to work perfectly on night one. A customer with a broken app is annoyed; a driver with a broken app strands a family.
3. **Customer spine** (the 17 prototype screens): home with sign-in chip · 3 booking steps · flat price · contact + number read-back · the wall · sign-in · request claimed · confirm & pay · locked in · driver-assigned push · landed · the name-sign · in transit · receipt.
4. **The two edges you cannot launch without:** flight delayed (`7a`, `8a`, `61a`) and the cancellation/change policy (`72a`–`72f`, `73a`–`73c`).
5. **Dispatch** (`68a`–`68c`) — see the surface note below.

**Explicitly v1.1+ — do not build now:** cruise port (65), group booking (69, 70), the two-driver compliment (71), wrong-number recovery (67), saved places, photos from your driver, left-item reporting, shift summaries.

---

## ⚠️ Stale documents in this bundle

**`PRODUCT_RULES.md` is the operator's older notes file. Three sections are now wrong:**

1. **Access** — says booking is never gated and offers email + password as a secondary sign-in. Superseded by the access model below.
2. **Refunds** — describes a $39 fee / $90-back model inside 48 hours. **Retired.** Inside 48 hours is non-refundable and cancel is not offered at all.
3. **Roles** — says the system does not distinguish user types. Superseded by the role model above.

Its navigation and driver-money rules remain correct. Everything else in it should be read against this document, not alongside it.

**`Pixie App Wireframes - Archive turns 1-52.dc.html`** is a record of rejected directions. Do not build from it.

---

## Access model (drives most screens)

**There is no access to a request without signing in.** No links, no SMS trip updates, no web fallback. Every attempt to soften this during design produced a contradiction that had to be retired.

1. **Anyone can request a ride.** No account needed to reach a price or submit. Booking collects only **name + mobile number**. No card. The mobile exists for one reason: it is how they sign in.
2. **The request screen is the wall** (`64b`). "Sign in to track this request" (primary), "Back to home" (exit). No third option.
3. **Declining is a real exit and costs the trip view.** "Back to home" returns to home with **no trace** — no pending card, no banner, no badge. Nothing arrives later by text.
4. **The phone number is the account.** No sign-up, no email sign-in, no password. If the number matches a pending request, it's already there on arrival.
5. **SMS carries exactly one thing: the sign-in code.** Never trip status, never the driver's name, never a receipt, never a payment link. Trip notifications go by **push to the signed-in app** — and by **email** for anyone who booked on the website. See "The app is an addition" below.
6. **No trip data leaves the account.** No shareable links, no emailed receipts, no public trip pages.
7. **Sign-in is reachable from the first screen** as a chip in the top corner — the likeliest visitor is a returning customer with a trip to reach.

### ⚠️ Open decision — verify the number before or after the request

Currently the code is entered *after* submitting, at the wall. The alternative is verifying at the contact step, *before* submitting.

Verifying first is fewer steps, not more:

```
now:       form → contact → submit → wall → enter mobile again → code → request
proposed:  form → contact → code → submit → request is already yours
```

It also deletes the wall (`64b`), the entire turn-67 claim-by-phone failure set, and unclaimed requests as a routine path — which is most of what dispatch's queue exists to handle.

The cost is gating the one currently-open step. **Decide this before building auth or the request pipeline**, because it changes both.

### The app is an addition, not a replacement — DECIDED

The website continues to take bookings and remains a first-class path. The app
is where a customer gets **more** — live driver position, push when the driver
is two minutes away, the name-sign, one-tap rebooking — not the only place a
trip can exist.

Consequences for this spec, all of which reverse earlier drafts:

- **Email exists and is required.** Confirmations, receipts and driver-assigned
  notices go by email for web-booked customers. An earlier draft said "there is
  no email anywhere in the product". That is no longer true.
- **Push cannot be the only notification channel.** `10b` (driver assigned) is
  currently reachable only from a push. Non-app customers must receive the same
  information by email.
- **The trip is one record, two surfaces.** A booking made on the web and later
  opened in the app is the same trip, matched by phone number.

**Do not gate anything behind the install.** If the driver's photo lives only in
the app while being deliberately withheld from the email, that is manufactured
scarcity and customers feel it. Give the photo in the email; let the app offer
what email genuinely cannot — live position, push, one-tap rebooking.

### Prompting the install — timing, not pressure

Airport transfers are booked once or twice a year. Asking for an install to
cover a single trip is a real ask, and a meaningful share will decline.

Ask when the value is closest, not at confirmation:

| When | Message |
|---|---|
| Confirmation | Full details by email. One line noting live tracking is in the app. |
| Driver assigned (~24h out) | "Nick's your driver tomorrow. His photo and live location are in the app." + deep link |
| On the day | Push if installed, text if not. Never punish the customer who declined. |
| After the ride | Receipt is in the app, rebooking is one tap. Also the review ask. |

**Deep link, never a store link.** Someone who taps should land on their trip,
already identified — not a store page, then a download, then a sign-in asking
for a number you already hold.

**Instrument it from day one:** installs as a percentage of confirmed bookings,
split first-time versus returning. If most first-timers install, app-first
becomes viable later. If they don't, email is the primary channel permanently.
That number decides the shape of the product.

## Product rules that must survive implementation

| Rule | Detail |
|---|---|
| **Payment cutoff: 6pm the day before pickup** | Full flat price paid and settled by 6pm the day before travel — the hour dispatch locks the next night's roster (shifts run 6pm–3am). Nothing is ever collected at the kerb, in the car, or after the ride. Past the cutoff an unpaid trip cannot run: dispatch writes it off or releases the driver (`68c`). |
| **Same-day requests are the exception** | A request made after its own cutoff is accepted when a driver is genuinely free. Payment due on confirmation with the 20-minute hold, no grace period. Never refuse a same-day booking on cutoff grounds alone — the family landing tonight is the core customer. |
| **Payment is 100% up front** | Charged the moment dispatch confirms. Never an authorization, hold, "charged after your ride", or "billed later". |
| **Requesting is free** | No card until a human confirms. Every pre-confirm screen says so. |
| **Cancelling is a refund** | Outside 48h of pickup: full refund. Inside 48h: **non-refundable**, and cancel is not offered at all. Changes free up to **2 hours** before pickup; inside 2 hours, phone only. |
| **Two ceilings on changes** | A **time or date** change on the same route costs nothing and stays free to the **2-hour** boundary. A change that alters the **route** re-prices, and a price difference must settle, so it stops at the **6pm-day-before** cutoff. Two ceilings, stated up front, never discovered at the end. |
| **No countdowns anywhere** | Every deadline is a formatted date and time. **Including the driver hold** — `26a` reads "holding your driver until 10:16pm", never a ticking 19:32. No red, no urgency styling. *(This corrects an earlier contradiction: the interactions section previously specified a live 20:00 → 00:00 timer. It does not.)* |
| **Deadlines are dates, never durations** | "11:40pm, Wed Aug 6", never "in about 20 hours". Never render a disabled button — show the action that IS available, which is why the booking detail is **three distinct states** (`72a`/`72b`/`72c`) rather than one screen with things greyed out. Recompute state on screen focus. |
| **One phone number** | Dispatch is **407-373-8735** throughout. Older canvas screens showing (407) 555 0180 need reconciling. (407) 555 0134 remains as Dana's own mobile in scenarios. |
| **Airline cancellation waives the fee** | Detected automatically. The customer does not have to ask or message anyone. `46a` still says "message us" and must be corrected to match `20a`. |
| **Price-increasing change** | Customer pays the difference at re-confirm. |
| **Price-decreasing change** | Refund the difference at re-confirm. *(Decided; no screen yet.)* |
| **Never a price on a driver payload** | Drivers are salaried employees, not gig contractors. No fares, payouts, earnings. **Enforced server-side, not by hiding in the UI.** |
| **Navigation always deep-links out** | "Navigate" opens Apple Maps / Google Maps. Never in-app turn-by-turn. No exceptions. |
| **15 vs 20 minutes** | 15 = how long a human takes to confirm. 20 = how long the driver is held while the customer pays. Never swapped or merged. |
| **The hold starts at claim, not confirm** | A confirmed request nobody has signed in for must NOT run the 20-minute hold or expire — someone who can't see the pay screen isn't ignoring it. Confirm → wait for claim → then hold and charge. Unclaimed requests go to dispatch. |
| **Messaging** | On trip day the customer messages the **driver**. Before trip day, messages route to **dispatch**. Driver-side messaging is always to dispatch. All in-app, signed in. |
| **Channels** | Push for app users, **email for everyone**. SMS carries the sign-in code only. Email is required, not optional — most customers book on the website. |
| **Waiting** | **60 minutes free on airport pickups, 15 minutes elsewhere.** No meter inside that window. Matches the live website Terms exactly — do not restate it as unlimited. |
| **No-show** | If the customer does not appear within the included wait time, the booking is a no-show and is **non-refundable**. The app currently has no concept for this and needs one. |
| **Confirmation time** | **Within the hour** for standard bookings, **within 2 hours** for group quotes. The earlier "15 minutes" figure is retired — it contradicted the live website and was never operationally true. |
| **Status spine — exact wording** | `Requested → Confirmed → Paid → Driver assigned → Complete`. Do not paraphrase these five labels anywhere. |

---

## Alignment with the live website — RESOLVED

The website is the source of truth for policy. These were previously in
conflict; the app must now match:

| | Agreed value |
|---|---|
| Cancellation | Free until 48h before pickup **time**. Inside 48h non-refundable, and cancel is not offered. |
| Changes | Free until **2 hours** before pickup. Closer than that, phone only. |
| Confirmation | Within the hour. Group quotes within 2 hours. |
| Airport waiting | 60 minutes free. 15 minutes for non-airport pickups. |
| No-show | Non-refundable. |
| Price | Final. Never changes after the availability check. |
| Receipts | Email for all customers; also in-app for app users. |

Any screen still stating "15 minutes to confirm" or "free waiting however long
it takes" is out of date and must be corrected before build.

## Voice

Specific and checkable, never adjectives. "Flat $129 to Disney, taxes in" — not "affordable luxury".

- Written from the customer's arrival, not the company's brochure.
- Speaks to *you*; the company is a quiet *we*.
- Sentence case everywhere except uppercase eyebrow labels (+0.16em tracking).
- Headlines are sentence case **with a period** — spoken reassurance, not ad slogans.
- Actions say what they do: "See my price", "Request this ride". Never "Submit" or "Learn more".
- Status is honest: it stays "Requested" until a human confirms. Never "Booked!" early.
- **No emoji.** Unicode only functionally: `→` in route lockups, `★` in ratings, `●` as the warm dot.

---

## Screens by role

Screen ids are the option ids on the wireframe canvas — search any file for `id="64b"`.

### Shared — auth

| id | Screen | Purpose |
|---|---|---|
| `33a` | **Sign in · mobile** | One field. "What's your mobile number?" Hint: "Just requested a ride? Use the same number and it'll be waiting inside." Footer: "First time? The same number works — we make your account as you sign in." |
| `33b` | **Sign in · code** | Six boxes, resend link. |
| `54a` | Forgot password | ⚠️ Obsolete — no passwords exist. Rebuild as "Can't get the code": resend, then call dispatch. |
| `32a`/`32b` | Driver sign-in | ⚠️ Not a separate flow. Same as `33a`/`33b`, different destination. |

### Customer — booking

| id | Screen | Purpose |
|---|---|---|
| `64a` | **Home (signed out)** | Route form on navy. Sign-in chip top-right. Primary: "See my price". |
| — | **Step 2 · passengers & flight** | Adults/children steppers, car seats shown as free, flight number. |
| — | **Step 3 · flat price** | Big orange price figure, three "included" rows, "Request this ride". |
| — | **Contact details** | Name + mobile only. Copy notes the name is what goes on the sign. |
| `64b` | **The wall** | "Your request is in review". Primary "Sign in to track this request", ghost "Back to home". ⚠️ Deleted if number-verification moves earlier. |
| `64c` | **Home, no trace** | Identical to `64a`, sign-in chip filled. |
| `1a`/`1b`/`6a` | Superseded | Don't build. |

### Customer — trip lifecycle

| id | Screen | Purpose |
|---|---|---|
| `26a` | **Confirm & pay** | Dispatch confirmed. Price, driver held **until a stated time**, Apple Pay + card. |
| `15a` | **Upcoming trip detail** | Navy header with route + status; light body with itinerary, price, quiet change/cancel. |
| `13a` | **Your trips** | Upcoming / past tabs. |
| `34a` | **Home · returning client** | Next ride, one-tap rebook. |
| `10b` | **Driver assigned** | Opened from a **push**. Driver card + spine. Contact routes to dispatch pre-trip-day. |
| `7a` | **Flight delayed** | Leads with what we did. Was → new pickup, price held. |
| `8a` | **Driver running late** | Map, was 11:40pm → now 11:48pm. |
| `61a` | **Landed / take your time** | Free waiting, wayfinding to claim 4 door A. |
| `4b` | **The name-sign** | Full-screen sign moment. |
| `12a`/`12b` | **Receipt** | Itemised to prove the total matches the quote. Gratuity shown as *included*. Rating last. |
| `55a` | **Compliment your driver** | Chips are the concrete promises. States plainly no tip is needed. |
| `72a`–`72f` | **Cancel / change states** | Three states, not one screen with disabled buttons. `72d` consent box is the only correct disabled primary. |
| `73a`–`73c` | **Change pickup** | Times as taps around the flight, not a picker. `73c` is the route-change collision. |
| `46a` | FAQ · flight late | ⚠️ Says "message us"; must match `20a`'s automatic waiver. |

### Driver — the run

| id | Screen | Purpose |
|---|---|---|
| `36a` | **Tonight's runs** | Three pickups. No money in the payload. |
| `31b` | Empty state | Honest "nothing scheduled". |
| `63a` | **At the airport** | Passenger, claim, door, flight state. "Navigate" deep-links out. Orange: "I've arrived at claim 4" — "This is what tells the family you're waiting." |
| `63b` | **Arrived** | Confirms the family was notified; previews the sign card. Also the resting state between hold-ups. |
| `63c` | **Sign mode** | Full-screen landscape. See below. |
| `28a` | **Pickup task** | Passenger, what's handled, where to stand, start trip. |
| `29a` | **Trip in progress** | Route + ETA + drop-off. No money. |
| `30a` | **Trip complete** | Summary, one-tap passenger rating, next pickup vs break. |
| `39a` | **Dispatch thread** | Re-times the run when a flight slips. |
| `28b` | Portrait sign mode | ⚠️ Superseded by `63c`. |

### Dispatch

Money is correct here. Drawn in a phone frame on the canvas for consistency.

**Surface decision needed:** with one app, dispatch is a role, not a separate product. `68a`'s queue works on a phone. `68b`'s attempt log with two parallel contact routes does not. Either accept a compressed phone layout or treat dispatch as a responsive web surface in the same codebase.

| id | Screen | Purpose |
|---|---|---|
| `68a` | **Unclaimed queue** | Sorted by **pickup proximity, not request age** — a trip tonight is an emergency, one in three weeks is admin. |
| `68b` | **What we know / what we've tried** | Attempt log so a second dispatcher doesn't re-dial a stranger. Two routes: the number given, and the hotel by guest name. |
| `68c` | **Send the car anyway** | Payment cutoff passed, trip can never be paid. Two options: write the run off, or release the driver. Recommended: send the driver and eat the fare — one written-off run costs less than a family stranded at midnight. Deliberate, logged, costed; never automatic. |

### Retired — do not build

`62a` (trip by text) · `62b` (trip in a browser) · `62c` (sign without the app) · `51a`/`52a` (share link) · `10a` (driver-assigned SMS) · `6a` · `28b` · `1a`/`1b`. Every one granted trip access without a sign-in.

---

## The name-sign (the signature moment)

The brand's most ownable asset. Same object on both sides: the driver holds it up, the customer sees it on their own phone before they walk out.

**Content**
- The **booker's first and last name** — "Dana Reyes". Not "The Reyes Family". Party naming (`The Reyes family · 2+1 · booster`) is correct on run lists and pickup cards, never on the sign.
- **Flight number and landed time** — "DL 1487 · landed 11:22pm · claim 4" — small, along the top, so the driver can confirm he's holding the right sign for the right arrival.

**Driver sign mode (`63c`)**
- **Locks to landscape.** That's how a phone gets held up in a crowd.
- **Full bleed, all chrome removed.**
- Name centred, **one line**, as large as the glass allows (134px in the 688×330 mock). Longer names **step the type size down; they never wrap**.
- **Brightness to maximum**, screen **kept awake**.
- **Tap anywhere to exit** back to `63b`.

**Customer side (`4b`)** — same object, navy ground, sign as a white lifted card.

---

## Interactions & behaviour

- **Navigation** — forward-only wizard for booking (3 steps + contact), back chevrons on detail screens.
- **The wall (`64b`) branches for real**: "Sign in" → auth stack; "Back to home" → home with no state.
- **Sign-in claim** — after code entry, match the pending request by phone number and attach it silently.
- **Price reveal** — the price figure counts up and settles with a ~6% ease-out-back overshoot.
- **Light trail** — the one place motion is spent: dust drifts along the path, the final node "lands". Easing `cubic-bezier(.22,1,.36,1)`. Everything else fades.
- **Driver hold** — expressed as a time ("until 10:16pm"), **not a ticking timer**. On expiry the driver is released and the customer re-quoted (`27a`).
- **Push notifications** are the point of the app: driver assigned, pickup moved / flight delay, "2 minutes away". Non-optional; `45a` shows them locked-on with a reason.
- **Flight watching** is server-side; the app reflects it. Pickup times change *without asking*.
- **Press states** — primary darkens orange → orange-hi; presses are subtle scale/opacity, never a colour invert. Active tab brightens to white + a small warm dot (never orange).

## State

- `auth`: `signedOut | codeSent | signedIn` (no password state).
- `user.role`: `customer | driver | dispatch` — **server-resolved, never client-set**.
- `pendingRequest`: server-side, keyed by phone; claimed on first successful sign-in with that number.
- `trip.status`: `requested | confirmed | paid | driverAssigned | complete` — rendered with the five canonical spine labels.
- `trip.pickupAt`: mutable server-side by flight watching; the UI must re-render "was → now" pairs.
- `driverRun.state`: `enRoute | arrived | signShowing | onTrip | complete`.
- `signMode`: boolean; while true, force landscape + max brightness + wake lock.

---

## Design tokens

Authoritative source: `designs/_ds/tokens/*.css`.

**Colour**
```
Sea (navy · structure)    --sea      #08344F   --sea-2 #0E4A6E   --sea-3 #175E88
Sky (light surfaces)      --sky      #EAF4FA   --sky-2 #DCEBF5   --sky-3 #C9DFED
Action                    --orange   #F97316   --orange-hi #EA580C   --on-orange #2B1206
Confirmed                 --green    #4E9E7A (fills)   --green-text #367254 (text on light)
Text                      --ink #08344F   --ink-2 #3D6480   --foam #A8CDE2   --foam-dim #7BA6C2
Surface                   --white #FFFFFF
```

**Colour rules (tripwires)**
1. No colour outside this palette. Ever.
2. **Orange means "act / look here"** — primary booking buttons, the price figure, the one emotional brand line. Never decorative, never a label or icon. On driver surfaces it marks the single action that advances the run.
3. **Never white text on orange** — use `--on-orange #2B1206` (white fails at 3.20:1).
4. Green fill vs green text are different values; the wrong one breaks contrast.
5. `--foam` / `--foam-dim` only read on the darkest navy; step one tone brighter on lighter navies.
6. `--sky-3` is a **surface/border** tone — never body text on white (1.38:1). Muted text on light is `--ink-2`.
7. **De-emphasise with size and hierarchy, never wrapper `opacity`.** `--foam` on `--sea-2` is 5.62:1; at `opacity:.82` the same text measures 4.34:1 and fails. Make a secondary element secondary with a smaller avatar, a smaller title, fewer details — leave the colours alone.

**Type** — two families only.
```
Display   'Bricolage Grotesque' 600–800   headlines, the accent line, the price figure
Body      'Instrument Sans'     400–600   body, UI, captions, uppercase eyebrow labels
Tracking  display -0.022em · h2 -0.02em · price -0.05em · uppercase label +0.16em
```

**Geometry**
```
radius    button 8px · input 12px · card 14px · pill 999px
spacing   4 8 12 16 24 32 48 64 96
shadow    card 0 1px 3px rgba(8,52,79,.08) · raised 0 6px 20px rgba(8,52,79,.10)
          lifted 0 20px 50px rgba(0,0,0,.28)
texture   --dot-warm on navy, --dot-ink on sky, 16px cell
```

Cards are borderless: separation comes from a **background shift + soft shadow + space**, never an outline. No aggressive gradients. Scrims (navy→transparent) only to guarantee text contrast over photos.

**Components** (`designs/_ds/components/`) — `Button`, `Input`, `IncludedRow`, `PriceDisplay`, `Card`, `Badge`, `RouteChip`, `ListRow`, `TabBar`, `TripStatus`, `LightTrail`, `NameSign`, `Logo`. Each has a `.jsx`, a `.d.ts` and a `.prompt.md`. Read these before rebuilding a primitive.

**Icons** — [Lucide](https://lucide.dev), ~1.8px stroke. Always navy or foam, **never orange**. The green tick and the light trail are drawn, not icon glyphs.

**Accessibility** — hit targets never below 44px. The mocks use 52–58px.

---

## About the design files

The files in `designs/` are **design references created in HTML** — prototypes showing intended look and behaviour. They are **not production code to copy.** Recreate them in the target codebase using its established patterns and component library.

The HTML uses a small in-house runtime (`support.js`) purely to render the canvas. Ignore it. What matters is the markup, the inline styles, and the tokens in `designs/_ds/tokens/`.

**Fidelity is high.** Colours, typography, spacing, radii and shadows are final. The copy is final — it has been audited twice and the exact wording carries product meaning.

Two exceptions, both explicitly low-fidelity:
- Map surfaces are abstract "light trail" SVGs. Use the platform's real map SDK; keep the trail styling as the visual language for the route.
- Photos are grey placeholder blocks. Direction is in `designs/_ds/readme.md`.

---

## Known gaps

1. **No-show needs designing.** The policy is now settled (non-refundable after the included wait time) but no screen exists. Driver side needs a "customer did not appear" action; dispatch needs to see it; the customer needs to be told.
2. **The return leg.** A family books MCO → Disney and needs Disney → MCO days later — the highest-probability second sale, with no concept. `34a`'s rebook repeats the same trip, not the reverse.
3. **Nothing feeds public reviews.** `12a` collects a rating that stays internal; `55a` collects compliments nothing consumes. The best moment to ask is right after a good arrival.
4. **A change that lowers the price.** Rule decided (refund at re-confirm); only the +$35 case is drawn.
5. **Refund timing is unspecified.** "Full refund" — when? Card refunds take days. Saying so prevents the support call.
6. **The 20-minute hold assumes tonight.** Meaningful for a same-day pickup, meaningless three weeks out. Check whether the hold should only exist inside some window.
7. **A second person on a trip.** The retired share-link answered a real need (the grandparent waiting up). Redesign as an in-account invitation.
8. **Number recovery.** Phone-only identity means a changed number is a lost account, recoverable only by calling dispatch. For a product used once or twice a year, that will happen. Email is now part of the product anyway, so an email on the account for recovery costs nothing to add and closes a real failure mode.
9. **Group booking** (turn 69–70) and **cruise port** (49) are designed but parked at v1.1.
10. **`73c` — dispatch taking a price difference by phone.** The only place money moves outside the app. If not permitted, `73c` becomes a flat refusal.

## Files

```
designs/
  Pixie App Wireframes.dc.html              CURRENT — turns 53-70. Build from this.
  Pixie App Wireframes - Archive turns 1-52.dc.html
                                            Archive. Contradicts later decisions. Do NOT build.
  Pixie Arrival Night - Prototype.dc.html   17 screens, the customer spine
  Pixie Flight Delayed - Prototype.dc.html  9 screens, DL 1487 slips twice
  Pixie App - Audit v2.dc.html              consistency audit — read "still open"
  _ds/                                      tokens, components, brand guide
  assets/                                   logos
PRODUCT_RULES.md                            ⚠️ stale on access, refunds and roles
```

Start with the audit (`Pixie App - Audit v2.dc.html`) — it lists which screens are superseded so you don't build from a retired one.
