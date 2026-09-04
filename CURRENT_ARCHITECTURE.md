# Current Architecture

This repository currently uses a static public site plus local-only admin workflow.

## Runtime Roles

- `public-site` is the static visitor site deployed to GitHub Pages.
- `admin-site` is a local-only editor used from the developer machine.
- `backend` is a local-only API used by `admin-site` for uploads, content edits, and local publishing. Local mode does not require accounts, passwords or session cookies.
- `shared` contains common types, UI helpers, content loading, and media URL handling.

## Content Sources

- `content/site-content.json` is the editable public content snapshot.
- `content/public/site-content.json` is the runtime copy served by the public site.
- `backend/data/local-store.json` is reserved for local private data such as messages and reviews.
- `content/public/uploads` is the only public media source for images and audio.

Do not restore public content from old backend stores, Supabase exports, Netlify functions, or `backend/uploads`.

## Generated And Legacy Paths

- `public-site/dist` and `admin-site/dist` are generated build outputs and may be deleted before rebuilding.
- `backend/uploads` is a legacy placeholder and should keep only `.gitkeep`.
- Netlify, Supabase, Render, R2, and Vercel files are historical references unless a future migration explicitly reactivates them.

## Publishing Flow

1. Edit content or upload media through the local admin site.
2. The local backend updates the content snapshots and public uploads.
3. The local publisher may commit and push only public content files and files under `content/public/uploads`.
4. GitHub Actions deploys `public-site` to GitHub Pages.

Private data, logs, build outputs, and local-only stores must not enter the public publishing queue.

For full repository uploads on Windows, `update-github.bat` and the compatibility alias `update-github-safe.bat` invoke the same tested Node uploader. It refreshes the current remote branch, blocks concurrent runs, credentials, oversized files, unresolved Git operations and behind branches, then runs `npm run ci` before staging all changes. A second remote refresh prevents pushing over changes that arrived during verification.

## Local Admin Access

### Windows Launcher

- Double-click `start-admin-site.bat` for the local API and passwordless dashboard. Keep its single console open; Ctrl+C stops only processes created by this launcher.
- Double-click `start-public-site.bat` for the local API and public site at `http://127.0.0.1:5173/`, without starting the admin frontend. It supports `--no-open`, `--check`, and `--help`.
- `start-admin-site.bat --with-preview` also starts the public preview needed by the mobile preview workbench. Both launchers share startup coordination and service identity checks; a later launch reuses ready services and starts only missing ones.
- Shared services remain owned by their original console. Keep the API owner's console open while either site needs it; Ctrl+C in that console stops its API as well. Stopping a later launcher never stops services it merely reused.
- `start-admin-site.bat --no-open` starts services without opening a browser. `--check` performs read-only checks; `--help` lists options.
- The launcher checks Node 20+, required modules, backend PORT, actual service identity, and readiness before opening `/dashboard`. Missing dependencies are installed with `npm ci` only when no standard project port is occupied.
- Existing `.env` files are preserved. Local API URL and preview URL overrides apply only to child processes, including a custom backend PORT from `backend/.env`.
- Logs are kept in the ignored `.local-admin/logs` directory. An incompatible/old service on a required port must be stopped from its original window; the launcher never kills an existing service to free a port.

- Open `http://localhost:5174` after `npm run dev:developer`; `/login` and `/admin/login` redirect directly to `/dashboard`.
- The local API and admin frontend bind to `127.0.0.1`. Admin API requests must also use a loopback Host and a trusted local admin Origin (5174 for development, 4174 for preview).
- Non-JSON mutations, remote peers and foreign web origins are rejected. `LOCAL_ADMIN_ORIGINS` can list alternative loopback admin ports.
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `JWT_SECRET` are ignored for local access. Legacy production API mode retains authentication; do not deploy the passwordless editor as a public service.

## Public Work Details

- Work details fetch the current content snapshot explicitly and share that response with related-work recommendations. Network failures offer retry; deleted works are not restored from stale cache or sample content.
- The gallery preserves image proportions, supports thumbnails, keyboard and swipe navigation, and provides a modal with fit/original-size modes. The modal contains focus, restores it on close, and locks background scrolling. Failed images can be retried.
- Non-empty content tabs use the `section` URL parameter, including in copied share links. Navigation from the work list retains filters and sorting when returning, including after tab changes.
- External demo/repository links allow only HTTP(S). Empty details, invalid dates and duplicate images/features have explicit handling. Feedback remains a contact link because the visitor site is static.

## Verification

### Developer editor behavior

- Admin reads fail explicitly instead of replacing server data with samples. Until data loads, editing is hidden and a reconnect action is available.
- Page, work and settings drafts survive section switches. Unsaved changes trigger a browser leave warning; switching works or discarding a page requires confirmation. Music clip drafts have a separate leave confirmation. Drafts are not persisted across browser shutdown.
- Ctrl/Cmd+S submits the current page, work or settings form. Mutation locking prevents duplicate submissions. Success means saved locally, not deployed online.
- Work multiline inputs retain raw text while typing, with parsing and limits checked on save. Gallery uploads append to the draft (including partial upload successes); saving the work attaches them. Cover images are saved separately without replacing other work edits.
- Featured order, site images and music-library changes save only their fields and preserve unrelated settings drafts. Empty explicit featured lists are distinguished from visitor-side automatic recommendations.
- Work search supports multiple terms, category filters and sorting. The overview exports saved public JSON only, excluding private messages, reviews and drafts. Image controls support click/keyboard as well as context menus.
- Mobile preview reports a missing local public server, supports reload and scales the fixed device viewport to fit. It displays saved visitor content, not unsaved drafts.
- Page canvases, music tools and the mobile preview are loaded on demand. Online content requests time out and asset verification uses batches of four requests.

- Run `npm test` for request, cache, search, audio and publishing-path regression tests.
- Run `npm run ci` for tests and all three production builds.
- Public production builds always use static content, even when a local `.env` sets an API URL.
- `VITE_BASE_PATH=/` builds for a root/custom domain; `VITE_BASE_PATH=/YvanLouise-web/` builds for the GitHub project URL. The deployment workflow reads `base_path` from `actions/configure-pages`, including domains configured directly in Pages settings.
- For local root-path preview in PowerShell: `$env:VITE_BASE_PATH='/'; npm run build:public-site`, then `npm --workspace public-site run preview`.
- Work filters use `type`, `q` and `sort` URL parameters. Audio is loaded only after an explicit play action.
