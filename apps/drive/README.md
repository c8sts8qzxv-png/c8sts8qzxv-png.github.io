# Traverse — driver (web)

The driver app as a real web application. It signs in against the Traverse
backend, goes on and off duty for real, reports the stop you are waiting at,
and shows the revenue the server has actually recorded.

## Why this exists rather than an Expo web export

The Expo apps do export to web — that was tried first and it works, once a
release-build guard that assumed iOS is exempted. What it produces is the
phone layout replayed in a browser: a 1456px-wide login field is not a
responsive design, and `react-native-web` gives no practical way to author a
different layout for a laptop.

So this is a separate front end against the same API. It reuses the contract,
not the components.

## No map, by design

A driver on this platform serves one campus they already know. The stop they
are waiting at is a name from a list, not a coordinate to be found, so the app
asks for the name. Nothing has to load, and nothing is billed per view.

## One deliberate omission

Ending a shift has no confirmation step. The backend's own comment says the
call is "never refused, and never questioned", and a dialog between a driver
and stopping work would be the app arguing with someone whose reason it cannot
see.

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
CORS_ALLOWED_ORIGINS="http://127.0.0.1:8802" npm run start:dev
```

## Deploying

Pushing to `main` builds and publishes to GitHub Pages. Set the API URL as a
repository variable named `API_BASE_URL` under **Settings → Secrets and
variables → Actions → Variables**.

It must be `https://` once deployed: a page served over HTTPS cannot call an
HTTP API, and the browser blocks it as mixed content with nothing useful in
the console.
