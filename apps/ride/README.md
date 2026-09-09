# Traverse — rider (web)

The rider app as a real web application. It signs in against the Traverse
backend, loads that campus's actual stops, and quotes real fares. It is not a
mock: nothing on screen is invented, and there are no fixtures.

## Why this exists rather than an Expo web export

The Expo apps do export to web — that was tried first and it works, once a
release-build guard that assumed iOS is exempted. What it produces is the
phone layout replayed in a browser: a 1456px-wide login field is not a
responsive design, and `react-native-web` gives no practical way to author a
different layout for a laptop.

So this is a separate front end against the same API. It reuses the contract,
not the components.

## No map, by design

Riders board at a fixed list of campus stops that already have names everyone
uses. A line with labelled nodes — pickup, drop-off, seats sold — says more
about a campus journey than a pin on tarmac, has nothing to fail to load, and
costs nothing per view.

## Running it

```bash
npm install
npm run dev
```

The API defaults to `http://127.0.0.1:3000`. Point it elsewhere with
`VITE_API_BASE_URL`.

The backend keeps an explicit CORS allow-list (never `*` — it moves money), so
add this origin before signing in:

```bash
CORS_ALLOWED_ORIGINS="http://127.0.0.1:8801" npm run start:dev
```

## Deploying

Pushing to `main` builds and publishes to GitHub Pages. Set the API URL as a
repository variable named `API_BASE_URL` under **Settings → Secrets and
variables → Actions → Variables**.

It must be `https://` once deployed: a page served over HTTPS cannot call an
HTTP API, and the browser blocks it as mixed content with nothing useful in
the console.
