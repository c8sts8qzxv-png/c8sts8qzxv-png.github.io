# Traverse — marketing site

The public site at `/`: a landing page, the legal documents under `/legal/`,
and the site-wide 404. The landing page carries a working walkthrough of the
rider app inside an iPhone 15 Pro Max frame.

**No build step, no dependencies.** Plain HTML, CSS and classic `<script>`
tags. It runs from GitHub Pages, from any static host, or by double-clicking
`index.html`. The one network request is the Albert Sans webfont from Google
Fonts; if it fails, the system sans-serif stands in.

## The skin is Uber's; the substance is ours

The visual system is uber.com's, measured on 17 Sep 2026 in Chrome on
uber.com/gh/en/ (home, `/ride`, `/drive`, a legal document and the 404). It was
read from the CSS rules that match each element at every media query, and from
the 722 custom properties Uber ships on `:root`, not eyeballed from
screenshots. Every token in `css/tokens.css` says what it was measured from.

What was taken:

- **Colour** — black and white, with Uber's greys: `#F3F3F3` cards and fields,
  `#F6F6F6` grey sections, `#333` running text, `#5E5E5E` meta, `#AFAFAF`
  footer small print, `rgba(0,0,0,.12)` card borders.
- **Type scale** — H1 36/44 → 44/52 (≥600px) → 52/64 (≥1136px); H2 28/36 → 32/40
  → 36/44; body 16/24.
- **Layout** — a 4 / 8 / 12 column grid at the same breakpoints (600 and 1136),
  gaps of 16 / 36px, a 1280px container with 24 / 32 / 64px gutters, 64px black
  nav, links row at ≥1120px and a full-height menu below it.
- **Components** — 48px black buttons at 8px radius, 36px pills, 56px grey
  fields, the underline link that grows on hover (0.5s), `<details>` FAQ rows,
  the "Explore" cards, the "Benefits" panel, the bordered app-download cards,
  the black footer.
- **States** — hover and press as inset overlays (`rgba(255,255,255,.1/.2)` on
  black, `rgba(0,0,0,.04/.08)` on white), a 3px `#276EF1` focus ring.

What was not, per the brief: Uber's logo and name, its licensed typefaces, its
illustrations and photography.

**Typeface.** Uber Move is licensed, so it is replaced with **Albert Sans**,
chosen by measurement: rendered beside Uber Move in the same page, its 700
headline ran 1.6% wider, matched cap height to 0.1px, and body text ran 1.3%
wider. It came first of 18 open grotesques on that test.

**Removed with the reskin.** The campus switcher (nav and headline), which
repainted the page in each school's colours; the dark-mode toggle; and the
scroll-reveal fade. uber.com has none of them, and only one campus is open, so
the page renders the live campus from `js/data.js`. `js/theme.js`, the port of
the app's colour system that powered all three, is deleted.

## The phone

An iPhone 15 Pro Max at its real size: a 430 × 932 pt screen with 55 pt corners
in a 463 × 965 pt body. Sources are in the comment at the top of
`css/app.css`. The Dynamic Island and home indicator are drawn at commonly
quoted sizes that were **not** verified against a primary source.

On a screen narrower than the body, the whole frame is scaled down
(`--device-scale`, set in `js/landing.js`), so the app inside still lays out as
it would on a 430pt-wide phone. Below 600px that preview is too small to use,
so tapping it opens the app full-screen instead.

## What is real, and what is not

This matters if you are showing it to someone who will ask.

**Real — taken from the codebase, not invented:**

| Thing | Source |
| --- | --- |
| Campuses, stops, coordinates | `prisma/seed.ts` |
| Fare table (bands, party totals, promo column) | `prisma/schema.prisma` `School.distanceBands` / `fareTable` |
| Formatting (GHS, seat ratio, ETA range) | `rider-app/src/format.ts` |
| Ride tier names and copy | `rider-app/src/rideTier.ts` |
| Pass wording | `rider-app/src/campusPassCopy.ts` |

**The page states prices** — GHS 6 / 10 / 12 shared, 12 / 14 / 18 for the whole
car — and the off-campus GHS 18 a seat. The walkthrough's amounts come from the
same table in `js/data.js`; its "From GHS 6.00" is the table's cheapest shared
fare. That line used to read `FARE.baseFarePesewas`, which the price table
removed, and printed "GHS NaN" on two screens.

**Not real:**

- **Drivers, trips and the wallet ledger are invented.** They obey the real
  constraints (capacity 4, pooled candidates carry a measured detour, seats
  shown as occupied/total) but no such driver exists.
- **The campus road network is generated, not surveyed.** The *stops* are at
  their real coordinates; the roads between them are a plausible layout.
- **There is no backend.** Nothing is fetched, no account is created, no money
  moves. The promo code `FRESHER` is hardcoded to 20%.

## Running it

Any static server:

```bash
python3 -m http.server 8777
```

Then open `http://127.0.0.1:8777/`. The legal pages and the 404 use root-absolute
paths (`/css/…`), so serve from this directory rather than opening those from
disk. A plain static server does not reproduce Pages' 404 routing; see the root
README for checking that.

## Deploying

Built and published as part of the site in the repository root — this
directory becomes `/`, with the rider app at `/ride` and the driver app at
`/drive`. See the root `README.md`.

`.nojekyll` is committed so Pages serves the files as-is. `404.html` is the
site's 404 page and also routes missed app deep links back to the right app;
the script that does it runs before any stylesheet, and the root README explains
why it has to exist.

## The two doors

The nav and the hero both offer exactly two: **Ride** → `ride/` and
**Drive** → `drive/`. On the landing page those hrefs are relative rather than
`/ride`, so it still works opened straight off disk.

## Layout

```
index.html          landing page markup + inline icon sprite
404.html            site 404, with the /ride and /drive deep-link dispatcher
legal/*.html        privacy (riders, drivers), terms, and the legal index
css/tokens.css      design tokens, measured from uber.com
css/base.css        reset, type scale, grid, buttons, pills, text links
css/site.css        shared shell: nav, phone menu, footer, legal type, 404, offline banner
css/landing.css     the landing page's sections
css/app.css         the rider app demo and the iPhone frame
js/site.js          the phone menu (every page)
js/connection.js    the offline / restored banner
js/data.js          campuses, stops, fares, fixtures
js/map.js           SVG campus map, in the monochrome map ink
js/app.js           the rider app demo
js/landing.js       renders the fixture-driven sections, sizes the phone
```

## Motion

Only what uber.com does: the link underline grows over 0.5s on
`cubic-bezier(.22,1,.36,1)`; the phone menu fades and rises over 0.4s on
`cubic-bezier(.2,.8,.4,1)`; the FAQ chevron turns over 0.2s. Inside the phone,
screen pushes are 260ms and tab switches do not animate.
`prefers-reduced-motion` cuts every animation and transition to near zero.
