# Traverse — the website

One origin, three front ends, two subdomains.

```
/                 marketing          apps/marketing    static, no build
/ride             rider web app      apps/ride         vite + react
/drive            driver web app     apps/drive        vite + react

api.<domain>      the API            ../traverse                 (nest)
admin.<domain>    admin dashboard    ../traverse/admin-dashboard (next)
```

The front door is two buttons — **Ride** and **Drive** — in the nav and again
in the hero. Everything else on the marketing page is supporting material.

## Why this repo is named `<user>.github.io`

That name is not decoration. GitHub Pages serves a repo called
`<user>.github.io` from the **domain root**, and every other repo from
`/<repo>/`. A bare `/ride` and `/drive`, with no repo name in front, is only
possible as a user site.

It is also the arrangement that survives getting a real domain: drop a `CNAME`
into `apps/marketing/` (the deploy copies it to the site root) and point the
DNS here. The three paths do not change, so nothing has to be rebuilt twice.

## Why one repo instead of three

The marketing page, the rider app and the driver app each had their own repo
and their own Pages site, on three separate origins. They are one product, so
they are now one deploy.

The alternative — a thin repo whose workflow checks out the other three — was
rejected for a specific reason, not a stylistic one: a push to the rider repo
would not rebuild this site. `/ride` would silently serve an older build than
its own `main`, and nothing would report it. Fixing that needs
`repository_dispatch` wiring between four repos, which is more moving parts
than a monorepo has.

**History came across.** Each app's commits were rewritten to sit under its
`apps/<name>/` prefix before merging, so `git log -- apps/ride/src/App.tsx`
walks the real history rather than stopping at a merge commit. The SHAs
therefore differ from the original repos, which still hold the originals.

## Deep links, and the thing that is easy to get wrong

GitHub Pages has no rewrite rules. Reloading `/ride/wallet` asks for a file
that does not exist, so Pages serves `404.html` — and handing that file the
app shell is what turns the miss back into the app.

With three apps under one origin there is a question with a real answer:
**does Pages honour a `404.html` inside `/ride/`, or only the one at the
root?** Rather than pick the likely answer, the deploy ships both:

- `dist/ride/404.html` and `dist/drive/404.html` — each app's own shell.
- `dist/404.html` — a marketing 404 that first checks whether the missed path
  was `/ride/...` or `/drive/...` and, if so, hands it to that app with the
  original path in `?_p=`. Each app's `index.html` puts it back in the address
  bar before the router reads it.

Whichever way Pages behaves, deep links work. If the nested files turn out to
be honoured, the root dispatcher simply never fires for app paths and can be
simplified away — check before deleting it.

The `?_p=` restore accepts only a same-origin absolute path. `//evil.example`
is a protocol-relative URL, not a path, and is rejected: otherwise the 404
page is an open redirect.

## The API URL

Both apps read `VITE_API_BASE_URL` at build time. Set it once, as a repository
variable named `API_BASE_URL` under **Settings → Secrets and variables →
Actions → Variables**. Until it is set the apps say so on screen rather than
failing silently.

It must be `https://` once deployed. A page served over HTTPS cannot call an
HTTP API — the browser blocks it as mixed content and says almost nothing
useful in the console.

**One origin means one CORS entry.** The API keeps an explicit allow-list
(never `*` — it moves money). Where three origins had to be listed, there is
now one.

## Working on it

```bash
cd apps/ride   && npm install && npm run dev    # 127.0.0.1:8801
cd apps/drive  && npm install && npm run dev    # 127.0.0.1:8802
cd apps/marketing && python3 -m http.server 8777
```

In dev each app is served at `/`, so `import.meta.env.BASE_URL` is `/` and the
router's basename follows it. The `/ride/` prefix only exists in a built site.

To check the assembled site the way it will actually be served — including the
404 behaviour, which no plain static server reproduces — build both apps with
their real bases and lay them out as the workflow does:

```bash
cd apps/ride  && VITE_BASE=/ride/  npm run build && cd ../..
cd apps/drive && VITE_BASE=/drive/ npm run build && cd ../..
mkdir -p dist && cp -R apps/marketing/. dist/ && rm -f dist/README.md
mkdir -p dist/ride dist/drive
cp -R apps/ride/dist/.  dist/ride/  && cp dist/ride/index.html  dist/ride/404.html
cp -R apps/drive/dist/. dist/drive/ && cp dist/drive/index.html dist/drive/404.html
cp apps/marketing/404.html dist/404.html
```

## Deploying

Push to `main`. `.github/workflows/deploy.yml` builds all three and publishes
one artifact. There is no separate deploy per app any more.
