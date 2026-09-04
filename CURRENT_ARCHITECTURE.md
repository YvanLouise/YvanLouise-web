# Current Architecture

This repository currently uses a static public site plus local-only admin workflow.

## Runtime Roles

- `public-site` is the static visitor site deployed to GitHub Pages.
- `admin-site` is a local-only editor used from the developer machine.
- `backend` is a local-only API used by `admin-site` for login, uploads, content edits, and local publishing.
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

## Verification

- Run `npm test` for request, cache, search, audio and publishing-path regression tests.
- Run `npm run ci` for tests and all three production builds.
- Public production builds always use static content, even when a local `.env` sets an API URL.
- `VITE_BASE_PATH=/` builds for a root/custom domain; `VITE_BASE_PATH=/YvanLouise-web/` builds for the GitHub project URL. The deployment workflow reads `base_path` from `actions/configure-pages`, including domains configured directly in Pages settings.
- For local root-path preview in PowerShell: `$env:VITE_BASE_PATH='/'; npm run build:public-site`, then `npm --workspace public-site run preview`.
- Work filters use `type`, `q` and `sort` URL parameters. Audio is loaded only after an explicit play action.
