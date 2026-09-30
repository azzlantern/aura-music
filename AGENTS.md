# Agent Instructions for aura-music

Aura Music v3.0.0: a client-side React 19 + Vite 6 + TypeScript music player (WebGL fluid background, canvas lyric rendering, Netease import/search), also shipped as a Tauri v2 desktop app. There is no app backend in this repo.

## Layout

- Repo root is the app root; `@/*` (Vite alias + tsconfig `paths`) resolves to the repo root.
- `index.html` → `/index.tsx` → `React.StrictMode > I18nProvider > ToastProvider > App`.
- `App.tsx` is the composition root: it calls `usePlaylist()` then `usePlayer({ ... })`, owns layout/mobile-swipe state and the theme-color meta, and loads the default playlist from `APP_CONFIG` in `config.ts`.
- `hooks/`: `usePlaylist` (import/queue/IndexedDB library), `usePlayer` (audio element, speed/pitch, MediaSession, blob caching), `useI18n` (inline `en`/`zh` dictionaries), `useLyricsPhysics` + `useAnimationInterpolator` (spring physics for canvas lyric lines), `useSearchModal`/`useSearchProvider`/`useNeteaseSearchProvider`/`useQueueSearchProvider`, `useKeyboardScope`, `useCanvasRenderer`, `useFitScale`, `useToast`.
- `components/`: `Controls`, `LyricsView`, `PlaylistPanel`, `SearchModal`, `TopBar`, `KeyboardShortcuts`, `AboutDialog`, `ImportMusicDialog`, `PwaUpdatePrompt`, `MediaSessionController`, `Toast`, `SmartImage`, `Marquee`, `FluidBackground`. `components/lyrics/` holds the canvas line renderers behind the `ILyricLine` interface (`LyricLine`, `InterludeDots`, `flowHeights`); `components/background/` holds the `BaseBackgroundRender` abstraction with UI and OffscreenCanvas worker backends; `components/visualizer/` runs an AudioWorklet plus a worker.
- `services/`: `lyrics/` parsers (LRC, Netease YRC, TTML via `fast-xml-parser`, translation/romanization merge, format auto-detection in `lyrics/index.ts`); `lyricsService.ts` (Meting / jimsdeng Netease / amll-ttml-db endpoints); `libraryStore.ts` (IndexedDB `aura-music` v1 with `meta` + `files` stores and a `playlist` snapshot, localStorage `aura:playback`); `cache.ts` (in-memory size-limited blob LRU); `utils.ts` (jsmediatags metadata, colorthief palette, CORS-proxy fallback); `keyboardRegistry.ts`; `springSystem.ts` / `spring.ts`; `audioLevelBridge.ts`.
- `src-tauri/` is the Tauri v2 shell (Rust side is nearly empty; `capabilities/default.json` grants only `core:default`). Keep frontend code working in a plain browser.
- `dist/` is build output. `App.tsx.bak`, `components/PlaylistPanel.tsx.bak`, and the empty `clean.html` are leftovers — ignore them.

## Commands

- Install: `npm install` (the committed lockfile and every workflow use npm).
- Dev: `npm run dev` (port 5173, host 0.0.0.0). Build: `npm run build`. Preview: `npm run preview`.
- Desktop: `npm run desktop:dev` / `npm run desktop:build` (Tauri; needs the Rust toolchain).
- Tests: `npm test` or `bun test tests`; single file `bun test tests/<file>.test.ts`; name filter `bun test tests --filter "<name>"`.
- Do not add Jest, Vitest, ESLint, or Prettier unless asked.

## Verification

- Tests use Bun's runner (`bun:test`) and live in `tests/`; `tests/i18n.test.ts` and `tests/library_store.test.ts` are the existing patterns.
- Run `bun test tests` before finishing non-trivial changes. Coverage is limited to pure exports (parsers, snapshot/migration helpers, dictionaries); canvas, worker, and network paths have no automated coverage, so exercise those in the browser.
- Test modules run without a DOM, so keep module-level browser access behind `typeof window` guards (see `hasWindow` in `services/libraryStore.ts`) or the import throws under `bun test`.
- `tests/*` is listed in `.gitignore` even though the existing tests are tracked; a new test file needs `git add -f tests/<new>.test.ts`.

## Style

- ES modules, 2-space indentation, semicolons, double quotes, trailing commas where practical.
- Prefer `const`, early returns, and dot notation over unnecessary destructuring or `else` chains; keep new local names short and single-word when clear.
- Keep React changes aligned with the hook-driven structure in `App.tsx` and `components/*`; keep heavy rendering in the canvas/worker paths instead of React state.

## Repo-Specific Gotchas

- `vite.config.ts` derives `base` from `mode` (`"./"` for production, `"/"` otherwise) and ignores `VITE_BASE_PATH`, so the Cloudflare workflow's `VITE_BASE_PATH="/"` is currently a no-op. Change the config if a real sub-path base is needed.
- `vite.config.ts` still defines `process.env.API_KEY` / `process.env.GEMINI_API_KEY` from `GEMINI_API_KEY`, but no source file reads them and `metadata.json`'s "Gemini-powered analysis" is stale. Never hard-code secrets.
- Tailwind is loaded from the CDN `<script>` in `index.html` — no Tailwind config or build step, so only CDN-available classes apply. Do not introduce a Tailwind toolchain unasked.
- `index.html` also loads jsmediatags and color-thief from CDNs while `services/utils.ts` imports the npm packages; the bundled imports are the source of truth.
- Unusual imports need declarations in `env.d.ts` (already: `*?worker&url` and the jsmediatags deep path). Background worker: `components/background/renderer/webWorkerBackground.worker.ts` via `?worker&url`; the visualizer uses `new Worker(new URL("./VisualizerWorker.ts", import.meta.url), { type: "module" })`.
- Background rendering has two interchangeable backends (`UIBackgroundRender`, `WebWorkerBackgroundRender`); a visual change must land in both, and the worker path silently falls back when `OffscreenCanvas` / `transferControlToOffscreen` is unavailable.
- Browser-side Netease/Meting requests try direct fetch first and fall back to the `api.allorigins.win` proxy (`fetchViaProxy` in `services/utils.ts`); upstream failures surface as "lyrics not found" or import errors rather than obvious network errors.
- PWA: `registerType: "prompt"` with `PwaUpdatePrompt`; workbox globs js/css/html/svg/png/webp/woff2 and navigates to `index.html`. The 4.9 MB `src/assets/fonts/Roboto-Regular.woff2` is why `maximumFileSizeToCacheInBytes` is 5 MB — a larger font needs a larger limit. The `@font-face` also lists a `.ttf` that is not in the repo.
- Deploys run on `main`: `.github/workflows/deploy.yml` (`npm install` → build → publish `dist` to `gh-pages`) and `.github/workflows/deploy-cloudflare.yml` (`npm ci || npm install`, build, Cloudflare Pages project `auramusic` via `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`).
- The default playlist is `APP_CONFIG.DEFAULT_PLAYLIST` in `config.ts`; the in-app import dialog is the path that needs no redeploy.

## What to Keep in Mind

- Use the README for deployment and local-run notes only where it matches `package.json` and the workflow files; when docs conflict with scripts or workflows, trust the executable source.