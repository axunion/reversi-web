# Edax build (public/edax/)

Reproduction record for the binaries in this directory, per spec 05 §4.

## Contents

- `edax.js` / `edax.wasm` — Emscripten build of upstream Edax's console engine.
- `eval.dat` — evaluation weights (from the official Edax v4.4 release archive).
- `LICENSE` — Edax's own license (GPL-3.0), copied verbatim.
- `emscripten-portability.patch` — the source patch applied before building (see below).

## Source

- Repository: <https://github.com/abulmo/edax-reversi>
- Commit: `14f048c05ddfa385b6bf954a9c2905bbe677e9d3` (2025-03-10)
- `eval.dat`: `https://github.com/abulmo/edax-reversi/releases/download/v4.4/eval.7z`, extracted with `7z x eval.7z` (`data/eval.dat`).

Spec 05's originally recommended `libedax` fork
(`sensuikan1973/edax-reversi`) turned out to be an iOS/UIKit
Objective-C wrapper (`libEdax4i`), not a portable C library — not
usable as-is for a Wasm build. This build instead follows spec 05's
documented fallback route (**Plan B**): the plain upstream console
engine, driven through its own text protocol.

## Toolchain

- Emscripten SDK: `emsdk install latest` → resolved to **6.0.6**
  (`emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 6.0.6`).

## Build command

```sh
git clone https://github.com/abulmo/edax-reversi
cd edax-reversi
git checkout 14f048c05ddfa385b6bf954a9c2905bbe677e9d3
git apply /path/to/emscripten-portability.patch   # see below

cd src
emcc bit.c board.c move.c crc32c.c hash.c ybwc.c eval.c endgame.c midgame.c root.c search.c \
  book.c opening.c game.c base.c perft.c obftest.c util.c event.c histogram.c \
  stats.c options.c play.c ui.c edax.c cassio.c gtp.c ggs.c nboard.c xboard.c main.c \
  -O2 -D_GNU_SOURCE=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=worker \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INVOKE_RUN=0 \
  -s EXIT_RUNTIME=1 \
  -s EXPORTED_RUNTIME_METHODS=callMain,FS \
  -o edax.js
```

`ENVIRONMENT=worker` matches the actual runtime (`src/ai/edax.worker.ts`
runs inside a Web Worker). An earlier build of this file used
`ENVIRONMENT=node` on the assumption that Emscripten's `callMain`/`FS`/
`Module.stdin`/`print` surface is generic across Node and Worker — it
is *not*: `ENVIRONMENT_IS_NODE`/`ENVIRONMENT_IS_WORKER` are baked into
the output as compile-time constants, and a `node`-targeted build's
very first executable statement is an unconditional `import("node:module")`,
which fails immediately in a real browser (confirmed with Playwright
against a real Chromium before this was caught and fixed). Node is
still useful for a *quick* local sanity check (see "Smoke test" below),
but the shipped build must target `worker`.

Single-threaded on purpose, per spec 05 §3: no `-pthread` means no
`SharedArrayBuffer`, so the app needs no COOP/COEP headers.

## `emscripten-portability.patch`

Four small changes to upstream's source, all mechanical rather than
behavioral:

1. **`bit.h`, `search.h`**: three internal functions/globals
   (`bit_is_single`, `SQUARE_VALUE`, `search_is_solving`) are defined
   in one `.c` file and used from another, but were never declared in
   the shared header — a latent bug that native GCC only warns about
   (implicit declarations) but Clang/Emscripten treats as a hard
   error. Added the missing `extern`/prototype declarations, matching
   the real definitions exactly.
2. **`edax.c`**: the `resources` debug command and its `#include
   <sys/resource.h>` are guarded by `__linux__`/`__unix__`, both of
   which Emscripten defines for its POSIX shim — but `getrusage`
   isn't implemented there (Wasm has no real process model). Added
   `&& !defined(__EMSCRIPTEN__)` to both guards; this only disables an
   irrelevant diagnostic command, not anything the app uses.
3. **`event.c`**: this is the substantive change. Edax's console UI
   reads stdin on a dedicated thread (`thrd_create` +
   condition-variable handoff to the main thread), so the game loop
   can stay responsive while pondering. Without `-pthread` (deliberately
   not used here, see above), that thread never actually runs under
   Emscripten, so the unmodified code hangs forever waiting on it.
   Since this build only ever drives Edax through a scripted,
   non-interactive `setboard` → `go` → `quit` sequence (never real
   concurrent input), `event_wait` was given an `#ifdef __EMSCRIPTEN__`
   branch that reads a line from `stdin` synchronously on the same
   thread instead of waiting on the queue — behaviorally equivalent
   for that one use case, without needing real threads.

## eval.dat

Placed at `data/eval.dat` inside the module's virtual filesystem
before `callMain` runs (`FS.mkdir("data")` + `FS.writeFile(...)`,
matching Edax's `-eval-file` default of `data/eval.dat` relative to
its working directory).

## Protocol from the worker

`src/ai/edax.worker.ts` drives this build by instantiating a **fresh**
module per search (the built module's `EXIT_RUNTIME=1` runtime cannot
be reused across multiple `callMain` calls), feeding
`setboard <64-char X/O/- board> <side>`, `go`, `quit` through
`Module.stdin`, and parsing the `Edax plays <move>` line `Module.print`
receives.

`edax.js` is loaded by `fetch`-ing it as text and `import()`-ing the
result as a `Blob` URL, not a direct `import("/edax/edax.js")`: Vite's
dev server explicitly refuses to serve files under `public/` through
its module graph ("should not be imported from source code... can
only be referenced via HTML tags"), and `/* @vite-ignore */` does not
suppress that check for a dynamic import running inside a Worker
bundle. The Blob URL sidesteps Vite's module graph entirely, in both
dev and production. Because the loaded module's `import.meta.url` is
then the `blob:` URL rather than `/edax/edax.js`, Emscripten's default
same-directory `.wasm` lookup no longer works, so `locateFile` is set
explicitly to `/edax/<file>` on every module instantiation.

## Smoke test

Two layers, both passing:

1. **Node** (spec 05 §3 note 4) — quick local sanity check during
   development: initialized the module with `eval.dat` in place, set
   the opening position, searched at level 1, 5, and 11, and confirmed
   the returned move was one of `d3`/`c4`/`f5`/`e6` in each case (also
   confirmed white-to-move works). Level 11 (hard) completed in ~1s
   from the opening position — well inside spec 04 §4's 30s
   client-side timeout. This layer alone missed the `ENVIRONMENT=node`
   mistake above, since Node satisfies `ENVIRONMENT_IS_NODE` by
   construction — it proves the C-level protocol works, not that the
   build loads in the real target runtime.
2. **Real browser** (Playwright + Chromium, driving `pnpm dev`) —
   caught the `ENVIRONMENT=node` build failing to load in a Worker at
   all, and confirmed the `worker`-targeted rebuild fixed it. Also
   exercised the actual production code path end-to-end through
   `src/ai/aiClient.ts` (not a standalone script): `init()`, a real
   `getBestMove()` from the opening position, two further sequential
   searches from different positions and levels, and a cancel-mid-search
   immediately followed by a new search — confirming the cancelled
   request's promise is left permanently unsettled while the new one
   resolves correctly, matching spec 04 §4's requestId-guard contract
   against the real engine, not just the mocked-worker unit tests.
