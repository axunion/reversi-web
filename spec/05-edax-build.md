# 05 — Edax Wasm Build & Asset Placement

How to produce the three files the app consumes and where they live. This is a
one-time setup step (Milestone M3); the Vite build never compiles C.

```
public/edax/
  edax.js      # Emscripten glue, ES module exporting a module factory
  edax.wasm    # engine
  eval.dat     # evaluation weights (required — Edax is drastically weaker without it)
```

## 1. Sources

- **Engine**: `https://github.com/abulmo/edax-reversi` — the canonical Edax (GPL).
  - Recommended base: the **libedax fork** `https://github.com/sensuikan1973/edax-reversi`
    (used by the `libedax4dart` project). It refactors Edax into a callable C library
    (`libedax` API: init / set position / search / read result as functions) instead of
    a stdin-driven console app, which is exactly what a Wasm worker needs.
- **Evaluation weights**: `eval.dat` ships in the asset archives of the official Edax
  releases (`abulmo/edax-reversi` → Releases → v4.4, `eval.7z`). A few MB uncompressed.
- License note: Edax is **GPL-3.0**. Shipping `edax.wasm` with this app is fine for this
  local project; record the license in a `public/edax/LICENSE` copy when placing the
  binaries.

## 2. Toolchain

Emscripten SDK (any recent version):

```sh
git clone https://github.com/emscripten-core/emsdk && cd emsdk
./emsdk install latest && ./emsdk activate latest
source ./emsdk_env.sh          # provides emcc
```

## 3. Build recipe

Single-threaded on purpose: no `-pthread` means no SharedArrayBuffer, so the app needs
**no COOP/COEP headers** and runs on any static host and on `pnpm dev` unchanged. The
speed cost is acceptable at our difficulty levels (≤ 11).

```sh
git clone https://github.com/sensuikan1973/edax-reversi && cd edax-reversi
# build the libedax sources (everything except the console main) with emcc, e.g.:
emcc src/*.c \
  -O2 \
  -o edax.js \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=worker \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_RUNTIME_METHODS=ccall,cwrap,FS \
  -s EXPORTED_FUNCTIONS=@exported_functions.txt \
  -s INVOKE_RUN=0
```

Implementation notes for whoever runs this (verify, don't assume):

1. **Exact source list and API names must be taken from the fork's makefile/headers**
   (`libedax` exposes its API in a header; the exported-functions file lists those
   symbols with leading underscores, e.g. `_libedax_initialize`, plus `_malloc`,
   `_free`). Do not guess names — read the header, then mirror the final list in a
   comment at the top of `src/ai/edax.worker.ts` so worker and build stay in sync.
2. **eval.dat is loaded through the Emscripten FS**: in the worker, `fetch("/edax/eval.dat")`
   → `FS.writeFile("data/eval.dat", new Uint8Array(buf))` **before** calling engine
   init (Edax looks for `data/eval.dat` relative to its cwd; pass the path via the
   init argv if the API takes one). This avoids `--preload-file` and keeps `edax.js`
   small and cacheable separately from the data.
3. Some Edax sources assume x86 intrinsics (`popcount`, AVX paths); build with the
   portable/generic flags the makefile provides for non-x86 targets. If the fork's
   makefile has an emscripten target already, prefer it over the manual `emcc` line.
4. Smoke-test the artifacts **before** app integration, in isolation
   (`node --experimental-default-type=module` or a scratch HTML page): init the engine,
   set the opening position, search at level 5, expect one of d3/c4/f5/e6.

### Fallback route (only if the library build proves impractical)

Plan B, same protocol, no app-side changes beyond the worker internals:
compile upstream Edax as-is and drive its **console protocol** over Emscripten stdio
(`print`/`stdin` callbacks on the module factory: send `setboard ...`, `level ...`,
`go`, parse the printed move). Uglier but known to work for console engines.
Plan C (last resort, keeps the game shippable): a small TypeScript alpha-beta engine
behind the same `search` message — the protocol (spec 04 §2) was designed so the UI
cannot tell engines apart. Document the chosen route in this file if it deviates.

## 4. Repository policy for the binaries

**Commit `edax.js`, `edax.wasm`, `eval.dat`, and the license copy to the repo**
(total expected well under 15 MB). Rationale: the app must be runnable from a fresh
clone by an AI agent without an Emscripten toolchain; these artifacts change
essentially never. Also commit a short `public/edax/README.md` recording: source
repo + commit hash, emcc version, and the exact build command used — enough to
reproduce the build byte-for-byte later.

## 5. Acceptance criteria (M3 exit)

- The three files (plus LICENSE and README) exist under `public/edax/`.
- The isolated smoke test (note 4 above) returns a legal opening move.
- `pnpm dev` serves `/edax/edax.wasm` with a 200 (no header tweaks needed).
- `public/edax/README.md` contains the reproduction record.
