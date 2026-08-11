# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page, self-contained PLC (ПЛК) training application. It teaches
IEC 61131-3 Structured Text concepts (scan cycles, latches/seal-in circuits,
AND/OR/NOT, TON timers) through a small ST-like language, and drives an
animated 2D scene built from a library of device types (conveyors,
gates/barriers, sliding doors, sensors, buttons, switches, lamps, motors,
sirens).

There is no build system, package manager, or backend — it's plain HTML/CSS/JS
in one file (`index.html`). Open it directly in a browser, or serve it
locally (e.g. `python3 -m http.server`) to avoid `file://` quirks. All
persistence (sandbox layout, code, completed-tutorial tracking) uses
`localStorage` — there is no server-side state.

## Windows launcher (`icon.ico`, `launch.vbs`, `create-shortcut.vbs`)

These three files let a Windows user run `index.html` as an app-like window
(no address bar, own taskbar icon) using their already-installed Chrome or
Edge in `--app` mode — no hosting, no build step, no install. `launch.vbs`
probes the standard Chrome/Edge install paths (Program Files, Program Files
(x86), and the per-user `%LocalAppData%` install location) and shell-runs
whichever it finds with `--app="file:///.../index.html"`; `create-shortcut.vbs`
is a one-time installer the user double-clicks to drop a desktop shortcut
(targeting `wscript.exe launch.vbs`, icon set to `icon.ico`). Both `.vbs`
files are saved as UTF-16LE with a BOM (not UTF-8) because they contain
Cyrillic strings and Windows Script Host's encoding auto-detection is
locale-dependent for plain ANSI — UTF-16LE+BOM renders correctly regardless
of the system codepage. `icon.ico` is a hand-assembled multi-resolution
container (256/48/32/16px PNG-in-ICO entries, no external tools) generated
by rendering a canvas in headless Chromium and packing the PNGs with a small
Node script — see git history for the generator if the icon ever needs
regenerating. None of this has been tested on a real Windows machine (the
dev sandbox is Linux-only); treat reported issues from actual use as
authoritative over the code's apparent correctness.

## Two modes

The app has two top-level modes, toggled by the header tabs and tracked in
`world.mode`:

- **Tutorial (`'tutorial'`)** — `TASKS` (an array near the top of the script
  section) defines fixed, non-editable device layouts and a scripted
  auto-grader per task. `loadTask(idx)` rebuilds `world.devices` from
  `task.devices`, sets starter code, and resets tag state. `runTaskCheck()`
  independently `compile()`s the user's current code and replays
  `task.steps` (a scripted sequence of `{set, now, expect, hint}`) through
  `execStmts` on an isolated scope — this grading path is completely
  decoupled from the live canvas simulation, so it's deterministic and fast
  regardless of scan rate or animation timing. Completed task indices persist
  in `localStorage['plcTrainerCompleted']`.
- **Sandbox (`'sandbox'`)** — free-form scene building via the palette
  (`renderPalette()` + click-to-arm-then-click-to-place on the canvas) and
  drag-to-move / select-and-delete in edit mode (`world.editMode`). Layout +
  code persist via explicit Save/Load buttons (`localStorage['plcSandboxScene']`
  / `['plcSandboxCode']`) and an Export/Import JSON textarea for
  copy-paste backup/sharing.

Switching modes saves the outgoing mode's editor contents (`savedTaskCode[idx]`
/ `savedSandboxCode`) so work isn't lost when flipping tabs.

## Architecture (all in `index.html`)

Three layers, kept decoupled — don't let physics/draw code call into the
parser, and don't let interpreter code touch the canvas:

1. **Interpreter** (`lex` → `Parser` → `evalExpr`/`execStmts`) — unchanged
   hand-written recursive-descent parser for the small ST subset: boolean
   assignment (`Tag := expr;`), `IF/THEN/ELSE/END_IF`, `AND/OR/NOT`,
   parenthesized expressions, and the built-in `TON(TimerName, condition,
   presetMs)` function block backed by a persistent `timers` object keyed by
   the timer's bare identifier. Any identifier not registered as a device tag
   is just an implicitly-declared internal boolean memory cell. `compile(src)`
   returns an AST; `execStmts` mutates whatever scope object it's given
   in place — this is what lets the same interpreter run both the live
   `IO` object during scanning *and* an isolated throwaway scope during
   tutorial grading.

2. **Device library / I-O layer** (`DEVICE_DEFS`, `IO`, `world.devices`,
   `runScan`/`startScan`/`stopScan`) — the simulated PLC and its field
   devices. Each entry in `DEVICE_DEFS` (`conveyor`, `gate`, `door`,
   `sensor`, `button`, `switch`, `lamp`, `motor`, `siren`) declares:
   `tags(id)` (which `IO` keys it owns and their direction, `IN`/`OUT`),
   `makeState()` (per-instance physics state), `physics(dev, dt, ...)`, and
   `draw(ctx, dev)`. A device *instance* is `{id, type, x, y, state}`;
   `addDevice`/`removeDevice` call `registerTags`/`unregisterTags` to
   add/delete the corresponding keys on the single global `IO` object.
   Compound devices expose multiple tags (`${id}_Motor`/`${id}_Sensor` for
   conveyors, `${id}_Open` for gates/doors); simple devices just use their
   own `id` as the tag (buttons, switches, lamps, motors, sirens, standalone
   sensors). `runScan()` re-executes the whole compiled program against
   `IO` on a fixed interval (configurable 50–500ms) — this is intentional,
   the pedagogical point being that a PLC re-evaluates its entire program
   every scan. A runtime error stops scanning and surfaces in `#errorBox`.

3. **Physics/render loop** (`stepPhysics`, `draw`, `frame` via
   `requestAnimationFrame`) — the "real world", running independently of
   and much faster than the scan loop by design. Each frame: conveyors move
   their box and write their own `_Sensor` tag and populate `boxPositions`
   (world-space centers, used by standalone `sensor` devices to detect
   proximity); `isBlockedNear()` gives gates/doors a way to hold back a
   conveyor's box based on screen-space proximity to the conveyor's exit
   point rather than any real graph/connection model — devices are wired
   together through the ST program, not through physical adjacency, except
   for this one blocking heuristic. Gate/door open-state easing, motor
   spin, and siren blink are all local per-device animation driven by
   reading the current `IO` value.

Supporting pieces layered on top of these three:

- **Syntax highlighting** (`updateHighlight`) is a classic textarea-over-`<pre>`
  overlay: a regex tokenizer (`HL_RE`) walks the source once, wraps
  keywords/`TON`/numbers/comments/`:=` in colored `<span>`s, and colors
  bare identifiers by looking up whether they match a currently-registered
  device tag (`IO_DIR_HINT`) — blue for inputs, green for outputs. The
  textarea's text is transparent with only the caret visible; the `<pre>`
  behind it renders the actual colors. Scroll position is synced manually.
- **Tag table** (`renderTagTable`) is regenerated from `world.devices` +
  `DEVICE_DEFS[...].tags(id)` every scan tick — it's simultaneously the
  "available tags to write in your program" reference and the live watch
  window, and it automatically reflects whatever's currently on the canvas
  in either mode.
- **Sound** (`ensureAudio`/`updateSirenSound`) is a single lazily-created
  `AudioContext` + oscillator, gated behind a muted-by-default checkbox and
  first-user-gesture initialization (autoplay policy), wrapped in
  `try/catch` so audio failures never break the simulation.

## Making changes

- There's no test framework wired into the page. When changing the
  interpreter (lexer/parser/`evalExpr`/`execStmts`), sanity-check it with a
  quick standalone Node script (duplicate those functions into a `.js`
  file, `node --check` it, then run a few `execStmts` scans with asserts)
  before wiring it back into `index.html`. When changing tutorial task
  logic, the same trick works for `runTaskCheck`'s scripted steps since
  grading never touches the DOM.
- For scene/UI changes, smoke-test in a real browser — Playwright + Chromium
  are preinstalled (`executablePath: '/opt/pw-browsers/chromium'`, do not
  run `playwright install`). Serve over `http://localhost`, not `file://`.
  When simulating canvas clicks/drags, **re-fetch `canvas.getBoundingClientRect()`
  immediately before each click** rather than reusing a cached box — several
  UI elements (the placement "Готово" button, the export textarea) toggle
  `display`, which reflows the page and shifts the canvas; a stale bounding
  box silently misses every device on the canvas.
- Adding a new device type means adding one entry to `DEVICE_DEFS` with
  `label`/`emoji`/`idPrefix`/`w`/`h`, `tags(id)`, `makeState()`,
  `physics(dev, dt, boxPositions)`, and `draw(ctx, dev)` — the palette,
  tag table, save/load, export/import, and highlighting all pick it up
  automatically by iterating `DEVICE_DEFS`/`world.devices`. Only give a
  device `interactive: 'momentary'` or `'toggle'` if a human should be able
  to click it during a run (see `onCanvasDown`'s dispatch on
  `def.interactive`).
- Both `TASKS[].devices` (tutorial) and hand-placed sandbox devices rely on
  the tag-naming convention documented above; if you add a task, keep tag
  names consistent with what `DEVICE_DEFS[type].tags(id)` actually produces
  (e.g. `Gate1_Open`, not `Gate1Open`) or the check steps will silently
  never pass.
