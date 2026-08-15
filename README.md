# rs-data-grid

A configurable, feature-rich data grid — built five times over, once per major
frontend framework, sharing one design and one feature set. All five live
side by side as [single-spa](https://single-spa.js.org/) micro-frontends
inside one shell, so you can flip between a React, Angular, Vue, Vanilla JS,
and jQuery implementation of the *exact same component* without a page
reload.

**Live demo:** **[rs-grid.netlify.app](https://rs-grid.netlify.app)**

Every implementation is also published standalone on npm, so you can drop
just the one you need into your own project without any of the
micro-frontend machinery:

| Package | Framework |
| --- | --- |
| [`rs-data-grid-react`](https://www.npmjs.com/package/rs-data-grid-react) | React |
| [`rs-grid-angular`](https://www.npmjs.com/package/rs-grid-angular) | Angular |
| [`rs-data-grid-vue`](https://www.npmjs.com/package/rs-data-grid-vue) | Vue |
| [`rs-data-grid-vanilla`](https://www.npmjs.com/package/rs-data-grid-vanilla) | Vanilla JS |
| [`rs-data-grid-jquery`](https://www.npmjs.com/package/rs-data-grid-jquery) | jQuery |

---

## What's actually in the box

Every one of the five grids supports the same feature set, built from the
same shared (framework-agnostic) store logic:

- **Data loading** — fetch from a URL (with method/headers/auth/token and a
  dot-path into the response body) or pass rows directly via `dataSource`;
  remote (server-paginated) or local mode
- **Filtering** — per-column dropdown filters, cross-filtered against each
  other's current selection
- **Sorting** — click-to-sort column headers
- **Global search** — one search box, matches across every column
- **Pagination** — sliding page-number window, page-size picker, jump-to-last
- **Three CRUD modes** — `popup` (modal add/edit), `row` (inline single-row
  edit with a confirm step), `batch` (every row editable at once, one commit
  diffs everything changed/added)
- **Drag-and-drop** — reorder rows and/or columns at runtime
- **Column picker** — a Grid Settings dialog to show/hide and reorder
  columns, persisted to `localStorage`
- **Export** — the currently displayed rows (respecting filter/search/sort/
  page) to Excel or PDF
- **Theming** — light/dark, plus ~10 independent border/line/spacing toggles

The demo shell's sidebar exposes every one of these as a live control, and
pushes changes straight into whichever framework tab is currently mounted —
so the *same* setting change re-renders the React grid, the Angular grid, the
Vue grid, etc., identically.

## Architecture

```
rs-data-grid-root-config          ← the shell: mounts/switches tabs, owns the
        │                           sidebar, and is the only thing deployed
        │                           at the domain root
        │
        ├── rs-data-grid-react     ┐
        ├── rs-data-grid-angular   │  five independent single-spa
        ├── rs-data-grid-vue       │  "applications" — each is its own
        ├── rs-data-grid-vanilla   │  Vite/Angular-CLI project, its own
        └── rs-data-grid-jquery    ┘  npm package, its own test suite
```

`rs-data-grid-root-config` is a plain [single-spa](https://single-spa.js.org/)
root config: it registers each framework app as a root parcel, keyed off
`location.hash` (`#/react`, `#/angular`, `#/vue`, `#/vanilla`, `#/jquery`),
and mounts/unmounts them as you switch tabs. Only the active tab is ever
mounted. Live settings changes reach the mounted parcel through single-spa's
own `update()` lifecycle — the shell never talks to a framework's internals
directly.

Each framework app is otherwise a **complete, independent project**: its own
`package.json`, its own dev server, its own build, its own test suite, no
shared `node_modules` and no monorepo tool (no Nx/Turborepo/Lerna) tying them
together. The only thing that couples them is the shared *shape* of the grid
component's props/inputs and the store logic each of them ports faithfully
(`store/dataGridStore.*` in every project — pure, framework-agnostic
filter/sort/search/pagination logic, adapted to each framework's own
reactivity system).

For production, [`build-all.sh`](./build-all.sh) builds all six projects and
copies each framework's single-spa bundle into
`rs-data-grid-root-config/dist/mfe/<name>/`, so the whole thing ships and
deploys as **one self-contained static folder** — which is exactly what's
running at [rs-grid.netlify.app](https://rs-grid.netlify.app) (see
[`netlify.toml`](./netlify.toml)).

### Project modules

| Folder | What it is | npm package | Dev port |
| --- | --- | --- | --- |
| [`rs-data-grid-root-config`](./rs-data-grid-root-config) | The single-spa shell: tab switcher, sidebar, code/wiki viewers | *(not published — app shell)* | `9000` |
| [`rs-data-grid-react`](./rs-data-grid-react) | React implementation | `rs-data-grid-react` | `3000` |
| [`rs-data-grid-angular`](./rs-data-grid-angular) | Angular implementation (library `rs-grid-angular` + a thin demo app) | `rs-grid-angular` | `4200` |
| [`rs-data-grid-vue`](./rs-data-grid-vue) | Vue implementation | `rs-data-grid-vue` | `5173` |
| [`rs-data-grid-vanilla`](./rs-data-grid-vanilla) | Plain JS/DOM implementation, no framework | `rs-data-grid-vanilla` | `3001` |
| [`rs-data-grid-jquery`](./rs-data-grid-jquery) | jQuery implementation | `rs-data-grid-jquery` | `3002` |

Each framework folder has its own README with that package's install/usage
instructions and full prop reference (also mirrored in-app: click the
**Wiki** tab next to any framework's demo).

---

## Getting started

There's no root `package.json` — each of the six folders is installed and
run independently:

```bash
git clone https://github.com/RecepSivri/rs-data-grid.git
cd rs-data-grid

for dir in rs-data-grid-root-config rs-data-grid-react rs-data-grid-angular \
           rs-data-grid-vue rs-data-grid-vanilla rs-data-grid-jquery; do
  (cd "$dir" && npm install)
done
```

### Run it like the real thing (recommended)

This builds every project and previews the exact static bundle Netlify
serves — one process, one port, no cross-origin dev-server juggling:

```bash
./build-all.sh   # builds all 6, consolidates into rs-data-grid-root-config/dist/
./serve-all.sh   # serves that one folder at http://localhost:9000
./stop-all.sh    # stop it
```

### Run it in development (hot reload, one framework at a time)

The shell expects each framework's dev server to be reachable at its own
port (see the table above). Open a terminal per app you want live:

```bash
# terminal 1 — the shell
cd rs-data-grid-root-config && npm run dev        # http://localhost:9000

# terminal 2 — whichever framework(s) you're working on
cd rs-data-grid-react && npm run dev               # http://localhost:3000
cd rs-data-grid-angular && npm start                # http://localhost:4200
cd rs-data-grid-vue && npm run dev                  # http://localhost:5173
cd rs-data-grid-vanilla && npm run dev              # http://localhost:3001
cd rs-data-grid-jquery && npm run dev               # http://localhost:3002
```

Visit `http://localhost:9000` and switch tabs — the shell loads whichever
framework app you have running from its own dev server.

Each framework folder can also be run **completely on its own**, outside the
shell entirely (`npm run dev` opens a standalone page mounting just that
grid against a demo dataset) — handy for working on one implementation in
isolation.

---

## Testing

Every one of the six projects carries its own unit test suite at **100%
coverage** (statements/branches/functions/lines) — five with
[Vitest](https://vitest.dev/), Angular with
[Karma](https://karma-runner.github.io/)/Jasmine, all via the `istanbul`
coverage provider.

Run an individual project's tests from inside its folder:

```bash
cd rs-data-grid-react   # or any of the other 5
npm test                # single run
npm run test:coverage   # single run + coverage report
npm run test:watch      # watch mode (where available)
```

Angular's suite runs in a real headless Chrome via Karma, so it additionally
needs Google Chrome installed locally.

### Consolidated report across all six

[`test-all.sh`](./test-all.sh) runs every project's suite with coverage and
generates one HTML dashboard summarizing test counts and coverage per
project side by side:

```bash
./test-all.sh
open .test-reports/index.html   # (test-all.sh does this automatically)
```

It doesn't stop at the first failing project — it always runs all six, so
the report reflects the full picture, and exits non-zero if anything failed.
Override `CHROME_BIN` if Chrome isn't at the default macOS path.

---

## Tech stack per implementation

| | Framework version | UI/dialog library | Notable |
| --- | --- | --- | --- |
| React | React 18 | MUI | — |
| Angular | Angular 20 (signals, `httpResource`, zoneless) | Angular Material | — |
| Vue | Vue 3 (Composition API) | Vuetify | — |
| Vanilla | — | native `<dialog>` | zero dependencies beyond `xlsx`/`jspdf` |
| jQuery | jQuery 3.7 | native `<dialog>` | event-delegated DOM updates |

All five share: [`xlsx`](https://www.npmjs.com/package/xlsx) +
[`jspdf`](https://www.npmjs.com/package/jspdf)/`jspdf-autotable` for export,
[Vite](https://vitejs.dev/) for dev/build (Angular uses the Angular CLI
instead), and TypeScript.

## License

MIT
