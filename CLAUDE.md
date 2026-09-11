# CLAUDE.md

Frankenportrait cuts three museum portraits into eye, nose and mouth bands and
stacks them into one face. Live at https://cogapplabs.github.io/frankenportrait/

## Commands

```sh
npm run dev        # vite dev server
npm run build      # tsc -b && vite build
npm run lint       # biome check .
npm run format     # biome check . --write
```

Lefthook runs biome, `tsc -b` and the build on pre-commit.

## Architecture

Vite + React + Tailwind v4, TypeScript strict, no router and no server. Search,
face detection and composition all run in the browser, which is what lets it
ship to GitHub Pages as static files.

### Providers

`src/lib/providers.ts` defines the contract; each provider registers itself in
`src/providers/` and `src/providers/index.ts` imports them for the side effect.

- `search(query, page)` returns `SearchHit[]`, each carrying a `sourceRef` that
  encodes the IIIF service base plus metadata, pipe-separated and URI-encoded.
- `resolve(sourceRef)` returns the service base and pixel dimensions.

`providerForRef` dispatches on the `<id>:` prefix, so a ref round-trips back to
the provider that made it.

Both current providers hit collection search APIs that need no key and send
permissive CORS. Adding one means a new file plus an import; nothing else knows
how many there are.

**A provider's image host must be IIIF level2.** The app asks the server for
arbitrary regions, which level0 endpoints refuse. FAMSF was evaluated and
dropped for this reason.

### The band cut

`src/lib/bands.ts` is the core. Even thirds only line up when every sitter is
framed identically, so cuts come off MediaPipe BlazeFace keypoints instead:
the eye midpoint and the mouth set the horizontal cuts, and inter-ocular
distance sets the slice width. Features then land on features whatever the
original framing.

`src/lib/shuffle.ts` orchestrates: `makeSlot` returns null when no face is
found, and `rollSlot` keeps drawing candidates until one works. Portrait
searches return plenty of text plates and specimen photographs, so several
misses per slot is normal.

Two guards keep bands off blank paint. `makeSlot` discards detections below
`MIN_SCORE`, and `bandRegion` discards a face whose eye-to-mouth drop exceeds
twice the inter-ocular distance, which means the detector has paired eyes with
something well below them.

Detection runs on a 640px-wide copy and the keypoints are scaled back up to
source pixels before the region is computed.

### Direction

`faceDirection` reads head yaw off the nose-tip offset from the eye midpoint,
in inter-ocular widths. `autoAlign` in `App.tsx` mirrors bands that face away
from the eyes band, so sitters end up looking the same way. It is head pose
rather than eye gaze and the keypoints are coarse, so the per-band Flip button
overrides it and stays put until that band is rerolled.

### Pool

`searchPool` fetches three pages of 100 per provider from a random offset in the
first 20 pages, then dedupes. Around 600 portraits per search, different each
time for the same term.

## Conventions

Tabs, double quotes, Biome v2 (never ESLint or Prettier). British English in
prose. No em-dashes anywhere, including comments and commit messages.

Comments explain why, not what. Most code needs none.
