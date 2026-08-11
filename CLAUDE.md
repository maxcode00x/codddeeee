# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page, self-contained PLC (ПЛК) training simulator. It teaches basic
industrial automation programming (IEC 61131-3 Structured Text concepts —
scan cycles, latches/seal-in circuits, TON timers) by letting the user write
a small ST-like program and immediately watch it drive an animated 2D scene
of a conveyor line with a sensor and a barrier gate.

There is no build system, package manager, or backend — it's plain HTML/CSS/JS
in one file. Open `index.html` directly in a browser, or serve it locally
(e.g. `python3 -m http.server`) to avoid any `file://` quirks.

## Architecture (all in `index.html`)

The file has three logically separate layers that must stay decoupled:

1. **Interpreter** (`lex` → `Parser` → `evalExpr`/`execStmts`) — a hand-written
   recursive-descent parser for a deliberately small ST subset: boolean
   assignment (`Var := expr;`), `IF/THEN/ELSE/END_IF`, `AND/OR/NOT`,
   parenthesized expressions, and a single built-in function block,
   `TON(TimerName, condition, presetMs)`, backed by a persistent `timers`
   object keyed by the timer's bare identifier. Any identifier not in `IO`
   is just an implicitly-declared internal boolean memory cell — there's no
   `VAR` block. `compile(src)` returns an AST; `execStmts` mutates the scope
   in place, mirroring how a real PLC scan writes outputs from inputs plus
   retained internal state.

2. **I/O / scan loop** (`IO` object, `runScan`, `startScan`/`stopScan`) —
   the simulated PLC. `IO.ButtonStart`/`ButtonStop`/`Sensor1` are inputs
   (only ever written by the physics layer or button handlers, never by the
   compiled program); `Gate1Open`/`Motor1`/`Lamp1` are outputs (only ever
   written by `execStmts`). `runScan()` re-executes the *entire* compiled
   program on a fixed interval (`setInterval`, configurable 50–500ms via the
   scan-rate `<select>`) — this is intentional: it's the pedagogical point
   that a PLC re-evaluates its whole program every scan rather than reacting
   to events. A runtime error during a scan calls `stopScan()` and surfaces
   the message in `#errorBox` rather than throwing silently.

3. **Physics/render loop** (`stepPhysics`, `draw`, `frame` via
   `requestAnimationFrame`) — the "real world" the PLC observes and
   controls, running independently of and much faster than the scan loop
   (by design, so the scan-rate dropdown visibly under/over-samples fast
   changes — e.g. `Sensor1` can flicker between scans at low scan rates).
   `Sensor1` is derived purely from the box's canvas position (it's a
   physical sensor, not something the program or user sets directly); the
   gate arm angle and box position are eased/clamped here based on the
   current output values from the scan loop.

Keep these three layers talking to each other only through the `IO` object
(and `timers` for the interpreter). Don't let `draw()`/`stepPhysics()` call
into the parser, and don't let interpreter code touch the canvas.

## Making changes

- There's no test framework wired into the page. When changing the
  interpreter (lexer/parser/`evalExpr`/`execStmts`), sanity-check it with a
  quick standalone Node script (extract or duplicate those functions into a
  `.js` file, `node --check` it, then run a few `execStmts` scans with
  asserts) before wiring it back into `index.html` — the interpreter has no
  browser dependencies so this is fast and catches parser bugs (e.g.
  ambiguous grammar between a bare timer-name argument and a variable
  argument in `TON(...)`) before they hit the UI.
- For scene/UI changes, smoke-test in a real browser rather than trusting
  `node --check` alone (which only catches syntax errors, not runtime ones
  against `document`/`canvas`/`performance`). Playwright + Chromium are
  preinstalled — launch with
  `executablePath: '/opt/pw-browsers/chromium'` (do not run
  `playwright install`), serve the file over `http://localhost` (not
  `file://`), and check `page.on('pageerror', ...)` plus the `#watch` panel
  text for expected `IO` values after simulated button presses /
  `waitForTimeout`.
- Adding a new device to the scene means adding fields to `IO`, wiring their
  physics in `stepPhysics`, drawing them in `draw`, and — if they're a new
  kind of input — deciding whether they're user-driven (a button, like
  `ButtonStart`/`ButtonStop`) or physics-derived (like `Sensor1`).
- The default program in `codeEl.value` is a working seal-in
  (start/stop latch) example plus commented-out exercises; keep it runnable
  as shipped, since `doCompileAndRun()` executes it immediately on page load.
