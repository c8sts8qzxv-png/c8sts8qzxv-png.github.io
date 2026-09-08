# Kay Rides — web demo

A working walkthrough of the Kay Rides rider app, as a static site. Built to be
shown to a client on a laptop or a phone when the real build will not install.

**No build step, no dependencies, no network calls.** Plain HTML, CSS and
classic `<script>` tags. It runs from GitHub Pages, from any static host, or by
double-clicking `index.html`.

## What it is

- A landing page (hero, features, fares, sharing, drivers, campuses, FAQ).
- The rider app itself, running inside a phone frame: login → home → pick stops
  → choose a ride → confirm → driver matched → trip → wallet / history /
  profile.
- A campus switcher that repaints the entire page *and* the app in any of the
  five configured schools' colours, in light and dark.

## What is real, and what is not

This matters if you are showing it to someone who will ask.

**Real — taken from the codebase, not invented:**

| Thing | Source |
| --- | --- |
| Colour system, per-school palettes, dark-mode derivation | `rider-app/src/theme/{color,schoolPalettes,index}.ts` |
| Spacing grid, radii, type weights | `rider-app/src/theme/spacing.ts` + screen StyleSheets |
| Press feedback (0.97 / 160ms / critically damped) | `rider-app/src/components/ui/PressableScale.tsx` |
| Campuses, stops, coordinates | `prisma/seed.ts` |
| Base fare, tier surcharges, group discount | `prisma/schema.prisma` School defaults |
| Fare arithmetic | `rider-app/src/fare.ts` |
| Formatting (GHS, seat ratio, ETA range) | `rider-app/src/format.ts` |
| Ride tier names and copy | `rider-app/src/rideTier.ts` |
| Pass wording | `rider-app/src/campusPassCopy.ts` |

Verified: standard GHS 5.00/seat, comfort GHS 7.50 (+50%), independent
GHS 12.50 (+150%); three seats = GHS 15.00 less a 10% group discount = GHS
13.50.

**Not real:**

- **Drivers, trips and the wallet ledger are invented.** They obey the real
  constraints (capacity 4, pooled candidates carry a measured detour, seats
  shown as occupied/total) but no such driver exists.
- **The campus road network is generated, not surveyed.** The *stops* are at
  their real coordinates; the roads between them are a plausible layout, not a
  map of real tarmac.
- **There is no backend.** Nothing is fetched, no account is created, no money
  moves. The promo code `FRESHER` is hardcoded to 20%.

## One deliberate departure from the app

The app stores UG-Legon's brand yellow as `secondary: #FFF700`. Painted as text
on the light background it measures **1.08:1** — illegible. Material 3 never
intends `secondary` to be used that way (it pairs with `secondaryContainer`),
so the demo derives a contrast-corrected accent that keeps the campus hue and
clears 4.5:1. Measured, all five campuses, light mode:

```
UPSA         #C9962C  2.55:1  ->  #8E6A1F  4.74:1
UG-LEGON     #FFF700  1.08:1  ->  #706D00  5.18:1
GIMPA        #D4A017  2.27:1  ->  #8A680F  4.93:1
CENTRAL-UNI  #C9A227  2.31:1  ->  #856B1A  4.88:1
ASHESI       #E0722C  3.04:1  ->  #B4561A  4.68:1
```

Dark mode already passed (10:1 and up) and is untouched.

**In the app, this affects exactly one place.** Grepping both Expo apps for
`colors.secondary` / `colors.tertiary` used as a foreground (excluding the
`...Container` and `on...` pairings, which are correct everywhere) returns a
single hit:

> `rider-app/src/components/RatingForm.tsx:30`
> `iconColor={value <= score ? theme.colors.secondary : theme.colors.outlineVariant}`

The filled stars in the post-trip rating form are painted in the campus
secondary on an elevated `Card` — so on Legon a *selected* star is yellow on
near-white. It is not a total failure, because the glyph also swaps
(`star` vs `star-outline`) and `accessibilityState` is set, so the state is
both shaped and announced. But visually the chosen stars wash out on the one
campus whose brand colour is a pure yellow. Passing that `iconColor` through
the same contrast correction would fix it without changing any other campus,
where the colour already reads fine.

`driver-app` is clean (its only match is `tertiaryContainer`, a correct
pairing), and `admin-dashboard` does not use the palette directly.

## Running it

Any static server:

```bash
python3 -m http.server 8777
```

Then open `http://127.0.0.1:8777/`. Opening `index.html` from disk also works —
there are no ES modules and nothing is fetched.

## Deploying to GitHub Pages

```bash
git init && git add -A && git commit -m "Kay Rides web demo"
git branch -M main
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch → `main` /
`(root)`**. The site is at `https://<you>.github.io/<repo>/`.

`.nojekyll` is committed so Pages serves the files as-is.

## Layout

```
index.html          markup + inline icon sprite
css/tokens.css      design tokens (spacing, radii, type, motion, fallback palette)
css/base.css        reset, press feedback, reveal, reduced motion
css/landing.css     the public page
css/app.css         the rider app
js/theme.js         port of the app's colour system + contrast-corrected accent
js/data.js          campuses, stops, fares, fixtures
js/map.js           SVG campus map
js/app.js           the rider app
js/landing.js       the page around it
```

## Notes on the motion

Durations and curves follow the same rules the app's own code comments argue
for. Press feedback is 160ms; screen pushes are 260ms `ease-out`; the bottom
sheet is 420ms on the iOS drawer curve, the one place the sub-300ms rule is
deliberately broken because a large surface travelling a long way reads as a
snap otherwise. `ease-in` is used nowhere. Tab switches do not animate at all —
they are pressed dozens of times a session, and at that frequency any animation
reads as lag.

`prefers-reduced-motion` removes movement but keeps opacity and colour, and
stops the looping decorative animations outright.
