# Pixie Rides — Design System (v2, the identity system)

Pixie Rides is a private transportation company in Orlando — airport (MCO), Disney, Universal, Port Canaveral, cruises, resorts. The customer is a parent or family arriving late at night with tired kids, or a group that wants no surprises. The competition is rideshare surge pricing and faceless car services.

**The promise this brand designs for is *certainty and care at the moment it matters most*:** someone is holding your name at baggage claim, the price was flat and known before you booked, the car seat is already installed, and your flight is being watched so your pickup moves if you land late. The feeling is **relief** — the exhale when you walk out of an airport at midnight and someone is already there, waiting, with your name. Not luxury. Not flashy. Trustworthy, practical, premium, human.

The name is literal design fuel: **"Pixie" → a trail of warm light that guides you from the plane to your bed.** That trail, and the **name-sign the driver holds**, are the two most ownable visual devices in the brand.

This project is **v2**: it extends the locked web design system (v1.2) off the website into every other surface — photography, print, a mobile-app UI kit, and social templates. It does **not** invent a new brand; every value is inherited from the sources below.

## Sources (the locked foundations)
- `uploads/pixie-rides-brand-guide.html` — the locked web design system v1.2 (full palette with roles, type scale, components, measured contrast table). **Source of truth for every value.** Sampled off the live site pixierides.com.
- The identity spec sheet (provided inline in the project brief) — copy-pasteable tokens, CMYK/Pantone starting points, social dimensions, the AI-image prompt skeleton, and the voice guide. All reproduced here in the relevant surfaces.

Everything in this system is traceable to those two documents. Where a judgment call was needed (a CMYK match, a social grid, a motion timing), it is marked as a **v2 decision to ratify** in the relevant card.

---

## CONTENT FUNDAMENTALS — how the copy is written

The voice is **specific and checkable, never adjectives.** Every claim can be verified: "Flat $129 to Disney, taxes in," "car seats free, fitted before we leave," "we watch your flight." Never "affordable luxury" or "premium travel." If a layout needs a word the product can't back up, the layout changes — not the voice.

- **Point of view:** written from the *customer's* arrival, not the company's brochure. "Someone is already there when you land," not "We provide reliable transportation solutions."
- **Person:** speaks to *you* ("your driver," "your name," "your pickup"); the company is a quiet "we" ("we're holding your name," "we watch your flight"). Never third-person corporate ("Pixie Rides offers…").
- **Casing:** sentence case everywhere except eyebrow labels, which are UPPERCASE with +0.16em tracking. Headlines are sentence case with a period — they read like spoken reassurance, not ad slogans.
- **Actions say what they do:** "See my price," then "Request this ride." Never "Submit," "Get started," or "Learn more."
- **Honesty in status:** booking stays **"Request received"** until a human confirms — never "Booked!" early. The receipt says "You're not charged until a human confirms."
- **Numbers are concrete:** "$129 flat," "11:40pm," "baggage claim 4," "1,200 airport runs." Specificity *is* the reassurance.
- **The three-beat rhythm** recurs in captions, carousels and Reels: **land · meet · rest** → "You land. We're holding your name. Kids in bed."
- **Emoji:** none. The warmth comes from the light and the words, not from emoji. Unicode is used only functionally (→ in route lockups, ★ in reviews, ● as the warm dot).
- **Vibe:** calm, plainspoken, quietly confident. A friend who has done this a thousand times telling you it's handled.

---

## VISUAL FOUNDATIONS

**Colors** — a strict, six-does-the-work palette (full roles in `tokens/colors.css` and the Colors specimen cards):
- **Navy family (Sea / Sea-2 / Sea-3)** carries all structure: backgrounds, headings, body text, icons.
- **Sky family (Sky / Sky-2 / Sky-3)** are the calm light surfaces; separation comes from a background *shift*, not borders.
- **Orange (#F97316)** is the single action / accent color. **The iron rule:** orange means "act / look here" — it appears *only* on primary booking buttons, the price figure, and the one emotional brand line. Never decorative, never a label, icon, or bullet. In any composition orange is the loudest thing and there is only a little of it.
- **Green** is two values: **fill (#4E9E7A)** for ticks/badges (white glyph on top) and **text (#367254)** for green *words* on light. Using the wrong one breaks contrast.
- **On-Orange (#2B1206)** is the only text color allowed on orange — **never white on orange** (fails at 3.20:1).
- Foam / Foam-dim read only on the darkest navy (#08344F); on lighter navies step text one tone brighter.

**Type** — two free Google Fonts, two jobs, never a third family:
- **Bricolage Grotesque** (600–800) — display/headlines, the accent line, and the price figure. Warm, characterful, tight tracking (−0.02 to −0.05em).
- **Instrument Sans** (400–600) — body, UI, captions, and uppercase eyebrow labels. Neutral and legible on purpose.

**Spacing & geometry** — 4·8·12·16·24·32·48·64·96 scale. Radius: button 8px, input 12px, card 14px. Max web content width ~1180px.

**Backgrounds & texture** — mostly flat navy or flat sky; **no aggressive gradients.** The one signature texture is a **low-contrast dot grid** (`--dot-warm` on navy, `--dot-ink` on sky, 16px cell) that adds richness without competing. Protection *scrims* (navy→transparent gradients) are used only to guarantee text contrast over photos. Depth comes from elements overlapping section edges, not from drop-shadow drama.

**Shadows & elevation** — soft and low: `0 1px 3px rgba(8,52,79,.08)` for cards, `0 20px 50px rgba(0,0,0,.28)` for lifted objects (name-sign, business card). **Borders are avoided** as the primary separator — use background shift + shadow + space.

**Corner radii & cards** — cards are 14px radius, borderless, with the soft card shadow and often the dot texture. They separate by tone (`white` / `Sky-2` / `Sea` / `Sea-2`), never by outline.

**Animation** — restrained. The one place motion is spent is the **light trail** (dust drifts and twinkles along the path; the final node "lands") and the **price** ("counts up," settles with a ~6% ease-out-back overshoot). Everything else fades. Easing `cubic-bezier(.22,1,.36,1)` for lands, linear drift for dust. See the "Caption voice, hashtags & motion" card.

**Hover / press** — the primary button darkens orange→Orange-Hi on hover; ghost/secondary buttons keep their outline. Presses are a subtle scale/opacity, never a color invert. Active tab in the app brightens to white + a small warm dot (not an orange fill — orange stays reserved for booking).

**Transparency & blur** — used sparingly: navy logo chips at 60–70% opacity with a small backdrop blur when a mark sits on a busy photo; protection scrims behind overlaid text.

**Imagery color vibe** — warm dusk/evening, teal-navy shadows, amber highlights, shallow depth of field, muted (not HDR). Orange lives in *light sources* (signage, sunset, interior glow), never as a global filter. Full direction in the Photography cards.

**Dark mode** — the brand is navy-first, so dark mode simply deepens the field (page drops one step below Sea to #06283C, surfaces lift toward Sea/Sea-2, ink→foam). Orange and the confirm-green semantics are unchanged; green text brightens for legibility. Defined as the `[data-theme="dark"]` scope in `tokens/colors.css`.

---

## ICONOGRAPHY

The source web system is **near-iconless** — it relies on type, color, and two custom devices rather than an icon set. Extending into an app, we needed functional glyphs, so:

- **UI icons: [Lucide](https://lucide.dev)** (loaded from CDN in the app kit and component cards). Chosen because its ~1.8px stroke weight and rounded-but-not-soft joints match Bricolage's warm-geometric feel. This is an **intentional addition / substitution** — the source defined no icon set, so Lucide is our proposed standard (a **v2 decision to ratify**). Icons are always navy/foam, **never orange** (orange is action-only).
- **The two brand devices are drawn, not icons:**
  - **The light trail** — nodes carry three minimal single-stroke glyphs (plane-arrival / signpost / moon) built into the `LightTrail` component to keep the device self-contained.
  - **The name-sign** — a typographic object, not an icon.
- **The green tick** (included/confirmed) is a CSS-drawn checkmark on a fill-green disc, not an icon-font glyph — it's a semantic mark, kept identical everywhere via the `IncludedRow` component.
- **Emoji: never.** **Unicode** appears only functionally: `→` (route lockups), `★` (reviews), `●` (the warm dot).
- **Logo:** the official mark — orange plane/swoosh + wordmark — supplied as `uploads/pixie_logo.svg` / `uploads/pixie_logo_transparent.png`. Shipped as `assets/logo-white.svg` (for navy grounds), `assets/logo-navy.svg` (wordmark recolored Sea for light grounds — the supplied file is white-only), `assets/mark.svg` (swoosh alone), `assets/logo-white.png` (raster), and the `Logo` component. The source swoosh orange (#F38202) is **normalized to brand #F97316** per the v1.2 rule ("logo orange must be brand orange, not a near-miss"). **v2 to ratify:** that normalization, and the Sea-navy recolor for light backgrounds.

---

## Index / manifest

**Root**
- `styles.css` — the single entry point consumers link (imports only).
- `tokens/` — `colors.css`, `typography.css`, `geometry.css`, `fonts.css`.
- `assets/` — `logo-white.svg`, `logo-navy.svg`, `mark.svg`, `logo-white.png` (official logo; swoosh normalized to brand orange).
- `thumbnail.html` — homepage tile.
- `readme.md` (this file), `SKILL.md`.

**Components** (`components/<group>/`, namespace `PixieRidesDesignSystem_457785`):
- `forms/` — **Button**, **Input**, **IncludedRow**
- `data/` — **PriceDisplay**, **Card**, **Badge**, **RouteChip**, **ListRow**
- `navigation/` — **TabBar**
- `feedback/` — **TripStatus**
- `brand/` — **LightTrail**, **NameSign**, **Logo**

Each directory has a `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md`, and one `@dsCard` HTML.

*Intentional additions (not in the source web system, added for the app/identity surfaces):* `RouteChip`, `ListRow`, `TabBar`, `Card`, `Badge`, `LightTrail`, `NameSign`, `Logo` — each grounded in the brief's app-component inventory and signature devices. `Button`, `Input`, `IncludedRow`, `PriceDisplay`, `TripStatus` map directly to the web guide.

**UI kit** — `ui_kits/mobile-app/` — click-through booking → price → trip-status → "holding your name" app flow. See its `README.md`.

**Surface specimen cards** (populate the Design System tab):
- Colors, Type, Spacing, Brand — `guidelines/`
- Print — `print/` (business card, name-sign, rack card, receipt, vehicle decal, production spec)
- Photography — `photography/` (look & grade, do/don't, composition, AI prompt)
- Social — `social/` (IG feed portrait, IG Story, IG grid, IG square templates, FB cover, TikTok, caption/voice/motion)

## Hard rules (the tripwires)
1. No color outside the palette in `tokens/colors.css`. Ever.
2. Orange only where the eye should go (book / price / the one line). Never decorative.
3. Never white text on orange — use On-Orange `#2B1206`.
4. Green fill vs green text are different values — use the right one.
5. Only Bricolage Grotesque + Instrument Sans.
6. Foam / foam-dim only on the darkest navy; step one tone brighter on lighter navies.
7. Copy stays specific and checkable.
8. The light trail and the name-sign are the two ownable devices — use them, don't dilute them.
