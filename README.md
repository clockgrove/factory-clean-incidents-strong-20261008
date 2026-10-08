# Synthetic support-incident explorer

This is an empty application starter with a deterministic fictional dataset. The application architecture, API, frontend structure, and implementation are deliberately open.

The qualification environment uses Node.js 24. Run `npm run seed` from this directory to create `.runtime/incidents.json`. The generator requires no packages or network access. Every invocation produces the same bytes. See `data/FIELDS.md` for the record meanings.

Keep `data/generate.mjs` and `data/FIELDS.md` unchanged. The application must treat the generated dataset as read-only. Add application code, useful verification, and startup instructions as needed. The installed browser-verification tooling and its exact command will be documented in the shared execution environment before either route begins; this starter does not claim that a browser is already installed.

## Exact shared commands

Generate the supplied canonical data:

npm run seed

Run complete verification, including meaningful application HTTP and browser checks you add:

npm test

The baseline uses Node's built-in `node:test` runner (generic `node --test` discovery). Its immutable data prerequisite runs before the test suite and installs the exact pinned development tooling with package lifecycle scripts disabled when needed. Keep the seed, pretest and test script bodies unchanged; add application verification in locations the generic Node test runner discovers. The initial passing data/tooling prerequisite is a tooling/data prerequisite, not application acceptance. Preserve `scripts/prepare.mjs` and the two `data/*` sources. Add the app, its startup instructions and meaningful real HTTP/browser verification without replacing these checks. Choose application architecture, API, UI and work breakdown freely.

Declare and implement a local startup script for this exact command, then document the actual URL/port and shutdown procedure:

npm run start

## Installed browser environment

All arms use the same pinned Playwright 1.64.0 and sandbox-enabled headless Chromium 156.0.8078.4. The provided package lock pins the Node browser tooling. Before importing Playwright for browser tests, set `PLAYWRIGHT_BROWSERS_PATH` to the provided browser directory. Use `{channel:'chromium', headless:true, chromiumSandbox:true}`; never add `--no-sandbox` or relax controls to pass a test.

The qualification host exposes the real `qualification-chromium` executable through a dedicated read-only tool prefix on PATH. Locate its alias using `command -v qualification-chromium`; the alias directory contains no application or account data. The browser directory is `../browsers` and the local library directory is `../host-libs/usr/lib/x86_64-linux-gnu` relative to that alias directory. Resolve those local tooling paths dynamically; do not hardcode a contributor workspace path in application code. Pass that library directory as `LD_LIBRARY_PATH` in Chromium's explicit child environment, with `ALSA_CONFIG_PATH` pointing to `../host-libs/usr/share/alsa/alsa.conf`. Do not assume arbitrary inherited environment variables survive worker isolation. Browser profiles and temporary files belong under the current checkout's ignored `.runtime/`; an explicit relative `TMPDIR='.runtime/browser-tmp'` (also TMP/TEMP) avoids Chromium's Linux socket-path length limit while keeping files in that workspace. Create that directory before launch, preserve the current checkout as cwd, and close the browser and any owned HTTP server in finally blocks. The controller's later shared screenshot assessment uses its independently proved short alias, retained separately.

Run actual local HTTP requests and real browser interactions against your implemented backend. Include data/sort/filter/pagination/whole-result-summary/details/export correctness and the human Objective's saved-view, keyboard, responsive, loading, empty, genuine failure and retry journeys. Do not mock or replace responses, generate screenshots of an imagined app, or treat this browser prerequisite as proof of application acceptance. Tests and app-local screenshots may use ignored `.runtime/`; commit source/verification/startup instructions, not runtime profiles or node_modules. Report an exact environment limitation if a required operation remains unavailable.

The same dedicated tool prefix also provides this actual browser/HTTP prerequisite command, after the data/tooling prerequisite has installed Playwright:

qualification-browser-smoke

It starts and closes a tiny real loopback HTTP page and sandbox-enabled Chromium, records actual process identities/launch argv and closure under ignored `.runtime/`, and reports the receipt path. It verifies the installed browser environment; it never supplies the application's behavior, design, API or passing acceptance.

## Run the finished explorer

From this checkout with Node.js 24 or newer:

```sh
npm run seed
npm run start
```

Open **http://127.0.0.1:3000**. Stop the server with **Ctrl+C** in its terminal. To choose another local port, use `PORT=3001 npm run start`. The server always binds to `127.0.0.1`. No build step or frontend dependency installation is needed to run the app; it uses Node's built-in HTTP server and browser-native JavaScript. The server reads `.runtime/incidents.json` once at startup and never writes it.

Start with all 2,400 incidents, newest first, 25 per page. Search is literal and case-insensitive. Checkbox selections within each category are combined with OR; categories, search and inclusive UTC dates are combined with AND. Clear individual selection chips or use Clear all. Sort ties always use ascending incident ID, including when sorting descending. Changing search, filters, sort or page size returns to page one. The daily chart and counts describe the entire matching result. Its expandable daily-count table includes zero days between the first and last matching dates.

Open a row to inspect every field; Escape or the close button returns to the same page and restores focus. Save current view stores a named view in this browser's local storage for this origin. Reload and choose it to restore the search, filters, sorting and page size. Saved views start on page one. Delete view removes only the saved view. Export CSV includes every matching row in the current sort order; all fields are quoted, embedded quotes are doubled, and rows use CRLF. Tags are serialized as a JSON array inside their CSV field. No incident data is editable.

## Application verification

```sh
npm test
```

The unchanged pretest verifies the generator, canonical bytes and pinned tooling. Node's generic test discovery runs `test/explorer.test.mjs`, which starts real ephemeral loopback servers and issues HTTP requests comparing query results against independent dataset calculations. It checks literal search, OR/AND filters, UTC endpoints, all sort directions and stable ties, pagination, whole-result counts and daily summaries, full details, invalid requests, and parsed CSV including multiline and quoted descriptions and all fields. It also checks that querying and exporting leaves the canonical bytes unchanged.

The browser test dynamically locates the supplied tooling, launches sandbox-enabled Chromium with the exact shared options and library environment, and exercises page navigation, detail focus restoration, search, filter combinations, sort/page size, saved views across reload, deletion, a real downloaded CSV, empty results, loading, a genuine offline request failure and successful retry, keyboard focus, and a 390px viewport. No HTTP responses are replaced. Screenshots are written to ignored `.runtime/desktop.png` and `.runtime/mobile.png`. Every browser and test server is closed in `finally` blocks. This browser verification requires the supplied `qualification-chromium` tooling described above; a missing tool or sandbox limitation fails the suite rather than skipping acceptance checks.

The API is read-only: `GET /api/options`, `GET /api/incidents`, `GET /api/incidents/:id`, and `GET /api/export`. Query parameters are `q`, repeated `service` / `status` / `severity`, `from` / `to` (YYYY-MM-DD), `sort` (`openedAt` or `severity`), `direction` (`asc` or `desc`), `size` (25 or 50), and `page` (starting at 1). The incidents response contains `items`, `summary`, `page`, and `size`; summaries cover every match.
