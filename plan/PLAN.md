# cognition — build plan (v2, after adversarial review)

**Status: building. Phases 0 and 1a through 1a.6 (the Deep Work studies) and 1a.7 (the Field engine: Drift, Bloom, Lattice) are built — see `plan/progress.md`, `plan/sound-dimensions-plan.md`, and `plan/current-state.md` for where the beats stand. Waiting on the user's by-ear milestones.**

v2, 2026-10-13. This version replaces the v1 draft. The v1 draft was reviewed through five lenses: DSP feasibility, Electron/Windows platform, research fidelity, fit to this user, and scope/verification. Each issue was then checked by a second skeptic. 81 issues survived. What changed is listed at the end.

Sources: `research/deeper-focus-research.md`, `research/autonomy-styles-states-research.md`, and the user's answers.

## What we are building

A personal, autonomous, generative sound engine for the user's Windows 11 desktop. It has two goals, and they carry equal weight:

1. **Recreate the beat and character** of Endel's *Plastikman: Deeper Focus* (the 2026 "Remastered & Reduced" edition at one chosen slider position): minimal techno with a steady pulse, sparse and dry, with deliberate silence and drift too slow to notice. All sound and code is original. We do **not** target Endel's own "Deep Work" or "Read" scenarios, which are different soundscapes.
2. **Discover what benefits this user's cognition**: focus, idea work, reading, reaching internal checkpoints, and states not yet named.

User decisions:
- **Personal tool only.** All data stays local.
- **Electron is fine.**
- **Every sensing signal is allowed as a separate opt-in.**
- **Possible ADHD and autistic traits**, as the user reports them.
- **Tasks:** idea work, "varied contextual fusions", reading, and checkpoints or states to reach.
- **No recording of Endel.** Tuning happens by ear.
- **Default style name:** "Deep Work".

**Engine policy.** *Defaults and autonomous moves are quiet-first and predictable-first. Manual controls may raise noise, modulation or pulse at any time, within the calibrated ceiling and the Sensory Guard. Only the Lab changes a default.*

## Ideas the design is built on

- **Focus signature.** The candidate properties behind the effect:
  - a steady pulse the listener can get used to;
  - sparse, dry, with negative space;
  - change below conscious notice;
  - no song form, no one-off sudden sounds, no vocals;
  - stable loudness;
  - optionally, beat-locked amplitude texture.

  Each property is a named parameter, and wherever it can be measured, also a metric.
- **Change budget.** A *band* (a minimum and a maximum) on how much the sound changes, measured in fixed units:
  - salient events per minute;
  - maximum step as a percentage of a parameter's range per minute;
  - minimum seconds between changes.

  A single ledger in the conductor tracks the budget, and every change source draws from it: arranger reshuffles, autonomy steps, arc ramps and state morphs. The research calls the trade-off between too little change (the listener habituates) and too much (it captures attention) *the* key tuning axis, so the budget has a floor as well as a ceiling.
- **Bar-latched commits.**
  - The conductor sends each decision as a single batch.
  - The DSP holds the staged values and applies them **all together on the next bar line**, triggered by a commit counter, so nothing ever lands half on one bar and half on the next.
  - The audio worklet reports `{commit, bar, frame}` back, and that becomes the logged time the change was heard.
- **Sensory Guard.** Absolute ceilings on overall level, brightness (high shelf), tick and hat level, bass and stereo width. Every style, morph, Explore session and Claude-authored file is clamped to them. They are seeded from the first listening sessions and only the user can raise them.
- **Salience limiter, three stages.** It *bounds* attention-grabbing events; it cannot prevent them all.
  1. Constraints at the source, enforced by the schema and the arranger: level cap per layer, minimum attack time, maximum brightness, and new layers entering only as fades of 2 bars or more.
  2. A fast lookahead peak and transient limiter with a ceiling relative to the current short-term loudness.
  3. A slow loudness-weighted stage that only ever turns the level down (no makeup gain), plus a high-shelf brightness cap that only cuts.

  The harness checks that it works.
- **Style as a document.** A style is a JSON file of parameter values over **one superset DSP**:
  - its layers;
  - its macros;
  - its drift bands;
  - its change-budget band;
  - its arc;
  - a non-mutable safety block.

  Because every style targets the same DSP, morphing, merging and mutating are operations on vectors of numbers, with no recompiling. Styles live in `styles/` and are hot-reloaded by a file watcher, so Claude and the user can author them directly.
- **State map and checkpoints.**
  - A session is a route through named states.
  - At the start of a session the user may name 0–3 checkpoints they intend to reach.
  - The mini window shows the next one.
  - Marking "reached" can trigger the next state in the route, with a calm, predictable arrival cue.
- **Discovery Lab.** One-person (n-of-1) trials that start early and run one at a time:
  - a passive primary outcome by default;
  - arms pinned to a style's content hash, so a style cannot change mid-trial;
  - a plain-language "leaning / not enough evidence yet" summary.

## Architecture

```
┌──────────────── Electron main (Node) ────────────────────────────────────────────────┐
│ Conductor host → drives pure conductor module on worklet bar ticks                   │
│ Signals (opt-in): clock · idle/lock & input-activity (powerMonitor) ·                │
│   foreground-app category (koffi, path only, hashed)                                 │
│ Hotkeys (4 + leader chord) · tray · single-instance · powerSaveBlocker during play   │
│ Logger (JSONL per day per stream) · style store + file watcher · endpoint watcher    │
└────────▲─────────────────────────▲────────────────────────────────▲──────────────────┘
         │ MessagePort (params,    │ IPC                            │ IPC
         │ bar telemetry)          │                                │
┌────────┴──────────────┐  ┌───────┴───────────────────────┐  ┌──────┴─────────────────┐
│ AUDIO window (hidden, │  │ PANEL window (React)          │  │ MINI window            │
│ no React, lives with  │  │ Session · Macros · Workshop · │  │ always-on-top,         │
│ the app)              │  │ Bench · States · Lab · Review │  │ non-focusable, static  │
│ AudioContext →        │  │ closing it hides it; audio    │  │ text ≤1 update/min     │
│ one Faust worklet     │  │ continues                     │  │                        │
│ (voices+FX+limiter+   │  └───────────────────────────────┘  └────────────────────────┘
│ guard+floor) → sink   │
│ (setSinkId)           │
└───────────────────────┘
Offline: same Faust program + same pure conductor on a virtual bar clock → WAV → TS harness
```

### The conductor is a pure module
`conductor.onBar(state, bar, inputs, rng) → {state, events[]}`.
- It contains no Electron imports, no `Date.now()` and no timers.
- It uses a seeded xoshiro PRNG.
- In the app, main drives it from bar ticks that the worklet reports.
- In `tools/render`, the same module is driven on a virtual clock with recorded or simulated signal traces.

So offline renders include the arranger and autonomy, and the harness tests what is actually heard.

### Parameter contract (`shared/contract.ts`, Phase 0)
- Every parameter declares `{id, range, default, unit, mode: glide{sec} | latch}`.
- Events have the shape `{applyAtBar, batch:[{paramId, target, mode}]}`.
- If an event arrives late, it applies on the next bar, and the bar it actually used is logged.
- The zod style-parameter enum is generated from the Faust program's `dsp-meta.json` at build time.

### Stack (pinned)
- **Electron and tooling.**
  - `electron@44.7.1` and `electron-vite@5.0.0`, exact versions.
  - Upgrade to 45 deliberately, re-running the soak tests.
  - The template's `postinstall`, electron-builder and the updater are removed.
  - The app runs via `electron-vite build && electron .` or a desktop shortcut. No installer.
- **Standing rule:** no dependency may need MSVC or node-gyp. Anything native is either prebuilt or optional.
- **DSP.**
  - `@grame/faustwasm@0.19.0`, exact.
  - **One** Faust program, split across `.dsp` files and joined through `component()`/library imports.
  - A single shared `faust-args` (`-double -ftz 2`, library path) used by the precompile, Workshop live compile and offline render.
  - Sample rate fixed at 48 kHz everywhere.
  - The audio window's content security policy allows `blob:` and `'wasm-unsafe-eval'`. libfaust's `.wasm`/`.data` files are served as static assets.
- **UI.** React in the panel only. Styles are edited in the user's own editor, using a JSON Schema written to disk, with a hot-reload file watcher. There is no in-app JSON editor.
- **Storage.**
  - `styles/*.style.json` holds the canonical styles, tracked by git.
  - `data/styles/` holds generated children until the user promotes one.
  - Session, bench, feedback and lab logs are JSONL under `data/`, which git ignores.
  - Every log header records `{sessionSeed, styleId, contentHash, appGitSha, outputDeviceId}`.
- **Foreground-app signal.** `koffi` (prebuilt) calls the Win32 API to read the foreground window's process path only. It never reads window titles, and it excludes the app's own process. **No** `get-windows` and **no** `uiohook-napi`: no global keyboard hook.
- **Endpoint watcher.** A long-lived PowerShell 5.1 child process with inline C# (CoreAudio callbacks; no MSVC needed). It streams JSON lines `{endpointId, masterScalar, muted, appSessionVolume}`.
- **Tests and harness.**
  - `vitest` for logic.
  - A TypeScript harness on offline renders: BS.1770 loudness, true peak, loudness steps and floor.
  - A Playwright-Electron smoke test, kept thin.
  - A soak suite.
  - The Python/librosa harness is deferred. It is added only if a recording is ever made, or spectral, novelty or pitch analysis becomes necessary. If it is added, it uses `uv` with managed Python 3.12 and librosa 1.0.x, processing renders in chunks.

### Repo layout
```
cognition/                 (own git repo — Phase 0 verifies show-toplevel = cognition)
  app/
    src/main/              conductor host, signals, hotkeys, tray, logger, style store, endpoint watcher
    src/audio/             hidden audio window: context, Faust node, sink, mic/BLE (later)
    src/panel/             React panel
    src/mini/              mini window
    src/shared/            contract.ts, conductor/ (pure), schema/ (zod), prng
    dsp/                   *.dsp (one program via component imports), faust-args
  styles/                  settle, deep-work, read-gate (overlay), fuse, incubate*  (*optional)
  tools/render/            offline renderer (DSP + conductor + style + seed + trace → WAV)
  tools/harness/           TS metrics + vitest assertions
  data/                    sessions, bench, feedback, lab, calibration, generated styles (ignored)
  research/  plan/
```

## The "Deep Work" sound (style #1)

Every value is a **starting point to tune by ear against the pinned reference**.

| Layer | Character | Key parameters | Serves |
|---|---|---|---|
| Pulse kick | Soft and round: sine with a short pitch drop, low-passed, no click | level, decay, tone; four-on-the-floor | steady pulse |
| Sub/bass | Mono, sparse offbeat or root notes, slow filter | density, octave, glide | pulse, low salience |
| Ticks/hats | **Identical** filtered-noise micro-bursts. Repetition of one sound is safe; changing pitch or timbre at 2–8 Hz is not | division (8ths/16ths), per-step probability, brightness, decay | pulse texture without changing-state |
| Sparse percussion | Rim, click or wood, very rare, never accented | probability per bar, level cap | variation without capture |
| Dub stab | One chord or blip in a fixed key, through a dub delay. Feedback ≤ 0.85, with a soft clipper and low-pass inside the loop | probability per 4–8 bars, filter drift, delay mix | Plastikman-like space |
| Pad/drone | Sustained, with slow filter and timbre drift (period ≥ 30 s) | level, brightness, drift depth | change below notice |
| Noise bed | Continuous, seeded and decorrelated L/R (never a looped buffer) | colour, level (default **off**) | masking, tuned per user |
| Beta texture | Beat-locked amplitude modulation on the pad only, in the 200 Hz–1 kHz band, at **8 cycles per beat** (13.3–17.3 Hz at 100–130 bpm). Clamped to 8–20 Hz, with a hard ceiling below 32 Hz | depth (default **0**), fade-in over minutes | "AM hypothesis (Brain.fm-style, weak evidence)" |
| Space | Short room plus dub delay; mostly dry; bass mono. Tuned for headphones: nothing hard-panned, and optional mild crossfeed (a long-session comfort heuristic, not research) | wet, width (moderate), delay division, crossfeed | dry and narrow |

Engine-wide:
- **Tempo.** Default 120 bpm, range 100–130. **Tap-tempo** sets it while Endel plays. Tempo changes take effect at the next bar line, and the delay input is ducked for one bar so the dub delay doesn't glitch.
- **Clocks and drift.** Clocks are wrapped phasors only, never growing counters. Drift uses seeded 1/f-style random walks with caps on how fast they can move. Process periods are incommensurate, so layers never line up into an obvious cycle.
- **Arrangement.**
  - An intro with fewer layers, then a recurring body.
  - **Reshuffle period** is an explicit parameter: default 8 min, range 3–15.
  - Reshuffles are crossfaded or bar-latched, and they draw from the change budget.
- **Pulse macro: Techno ↔ Ambient.** Scales kick and tick level, onset density and transient sharpness together.
- **Output floor (defence in depth).**
  - The main mechanism for keeping the session alive is `powerSaveBlocker('prevent-app-suspension')`.
  - The floor itself is a sub-audible ~18 Hz tone at **≥ −66 dBFS RMS, on both channels**, added as the very last stage after the volume control, limiter and fades.
  - This keeps Chromium treating the app as "audible" while Wind-down, Away and the Lab's silence arm stay perceptually silent.

## Control panel

- **Session.**
  - Start/Stop. Stop fades out over 2–3 s; holding the control cuts immediately.
  - Style or route picker.
  - 0–3 named checkpoints for this session.
  - **Hold**, which freezes all autonomy.
  - Autonomy amount (default low).
  - Task tag: Read, Fuse, Deep or Recover. Read turns on the **Read gate overlay** (defined below), and Fuse suggests the Fuse state.
  - Volume, with the dose meter (or "uncalibrated").
  - Output device.
- **Macros.** Pulse (Techno ↔ Ambient), Intensity, Warmth/Brightness, Density, Space, Tonality. **Movement** and the shaded autonomy bands arrive with Phase 4.
- **Workshop.** One page per layer, each with eight or fewer parameters, plus **solo/mute**.
- **Tuning Bench (Phase 1a).** Tools for the by-ear A/B against Endel:
  - an A/B hotkey that fades the engine out and in over ~1 s while the user handles Endel (optional Endel ducking via the endpoint helper);
  - a level-match trim set by ear and stored per device;
  - snapshot slots A/B/C;
  - a **note hotkey** that writes `{t, bar, styleHash, params, note}` to `data/feedback/`;
  - a checklist built from the research's open questions (tempo, pitch content, density, rate of change, space) with closer / further / same taps;
  - the **reference record**: Endel edition, slider position, heart rate connected yes/no, Endel and Windows volume, output device.
- **States and routes.**
  - A route editor (drag states, set dwell times).
  - Each transition is timed, checkpoint-triggered or autonomous.
  - **Every autonomous transition is announced** in the mini window 60–120 s ahead and can be declined with one key.
- **Review.**
  - By default, a 2–3 line summary in words: states reached, checkpoints, what the engine changed and why, and what the Lab is leaning toward.
  - The full decision timeline is one click away.
  - An optional weekly digest.
- **Mini window.**
  - Not focusable and not in the taskbar; shown without taking focus; always on top.
  - Static text, updated at most once a minute: state word, next checkpoint, elapsed time.
  - Macro dots appear only on hover or by opt-in.
  - It can be hidden while the audio continues.
- **Hotkeys.**
  - Four defaults: **Reached**, **Too much → Simplify**, **Hold/Resume**, **Stop (fade)**.
  - Plus a leader chord (Ctrl+Alt+Space, then a digit) for drifting, too little, bookmark and note.
  - Every registration is checked, and failures show in the panel and as a quiet glyph in the mini window.
  - The default key family is Ctrl+Alt+Shift+digit.
  - A "test hotkeys" page.
- **Simplify** (the "too much" key). Within 5–10 s it glides level, density and brightness down one step and pins them for the session. This bypasses the change budget, is logged as an override, and narrows that session's bands.
- **Creating styles.**
  - Duplicate.
  - A/B **morph crossfader** with save.
  - **Explore** bookmarks: an "Explore widens bands" notice shows, and the loudness ceiling and Sensory Guard stay in force.
  - The **Claude loop**: the user writes a style brief, Claude writes the file, the watcher hot-loads it, and the user compares it with its parent.
  - Mutate (≈6 branches around a radius), Merge and a mapping-table UI are deferred to Phase 5.

## States

| State | Phase | Sound | Change budget |
|---|---|---|---|
| **Deep Work** | 1a | as above | low band |
| **Settle** | 3 | Deep Work with fewer layers, lower level, slow fade-in; also used for ramp-in and re-entry | lowest band |
| **Read gate** *(overlay on any style)* | 3 | Defined below | applies on top of the active style |
| **Fuse** | 3 | **Audio for contextual-fusion work**: combining ideas across domains, which needs both holding several contexts and making loose associations. Hypothesis: keep Deep Work's steady pulse and its low-salience floor, so the sustained attention that holds the contexts is protected. Loosen the *associative* axes: slow modal and harmonic movement, consonant motifs that come back in new places, more air and space, and a reshuffle period near the short end. Brighter or wider only after a trial or an opt-in. Never louder than Deep Work. Divergent-thinking evidence for sound is weak, so the Lab decides | wider band (still within the Sensory Guard) |
| **Incubate** *(optional)* | 3 | Pulse dissolves into the pad, 10–15 min | moderate |
| Restore, Breathe, Wind-down | 5 | nature textures, a breathing pacer (filter swell, 4.5–6.5 breaths/min chosen by the user), and a pre-sleep fade | — |

**The Read gate.**
- It turns on when the task tag is Read or Write, or when the foreground app is in a category labelled reading/writing.
- It allows **no changing-token sequences at 2–8 Hz**: pitched events have a 2–8 Hz event rate of 0, and chroma change stays under a ceiling.
- **Identical-token ticks are explicitly allowed.**
- No formant-bearing sources.

Until Restore exists, a break fades to Settle or near-silence.

## Autonomy (Phase 4, staged)

Built in this order:
1. **Texture loop** (in the DSP). Micro-variation, statically bounded by drift bands and slew caps, as a reserved share of the change budget.
2. **Arc loop.**
   - **Ramp-in:** default 3 min, editable 1–10.
   - **Body:** soft ceiling around 90 min, editable, flagged as weak evidence.
   - **Break cue:** perceptible but never startling. A fixed signature gesture (the pulse thins over 2–4 bars) plus the mini window showing "Break". Deep Work keeps playing until the user goes idle or presses a key, and only then morphs to Restore or Settle. If the user keeps working for N minutes after the cue, it is logged as "declined" and the full pulse returns.
   - **Break cadence:** scheduled by default at 24/6. Declining a cue reschedules it one cycle later, and accept/decline history tunes the cadence. 12/3 and custom cadences are presets, with short (3–5 min) and long (15+ min) breaks.
   - **Re-entry:** triggered by more than 120 s idle or a screen lock. On return it resumes near the previous state; default hold 20 min, learned.
   - **Away for more than 20 min:** fade out and end the session. Exposure stops counting toward the dose while Away.
   - **On `suspend`:** flush logs and pause. **On `resume`:** check the audio context and output device, then run re-entry.
3. **Signals with control authority.** Clock, idle/lock, and **input activity**. Input activity is derived from `powerMonitor.getSystemIdleTime()` sampled at 1 Hz: active seconds per minute, the longest idle gap, and burst count. Hotkeys feed in as well.
4. **Passive-only signals, logged with no control authority yet.** The foreground-app category and switch rate.
5. **Phase 4b: the engagement/arousal state machine.** Hysteresis; at most one change per 5 min; steps of ~10% or less of a parameter's band; glides of 20–60 s.
   - **Gated** on a 14-day baseline and the result of Lab trial 4.
   - Until the heart-rate strap exists, *arousal* comes only from the hotkeys: Overloaded ← "too much", Drifting ← "drifting" plus idle and app-switch rate. There is no passive arousal signal.

Safeguards:
- A manual override always wins and freezes that parameter's autonomy for 20 min.
- No autonomous change happens within 3 min of an override.
- Hold and Stop each take one gesture.
- Every move is bounded, glided and logged.
- Level never rises autonomously.
- Quiet hours apply.

**Learning.** No bandit and no preferential Bayesian optimisation. Learning comes from three places:
- after-session band-narrowing suggestions based on the user's overrides;
- a **"what the logs suggest" review** that the user starts, where Claude reads the local JSONL and proposes one Lab question or one style tweak;
- Lab results.

A bandit is revisited only after 200+ sessions *and* if trial 4 favours autonomy.

## Discovery Lab

- **Before any trial.**
  - A **power simulation**, using plausible within-person variance, decides how many blocks a trial needs and whether a given outcome can detect an effect at all. The expected duration of each trial is shown.
  - A **1–2 week run-in** of normal use, so that early results don't just reflect the engine being new.
- **One trial at a time.**
  - Arms are pinned to a style's content hash.
  - Autonomy is pinned (off, or fixed per arm) during blocks.
  - One arm per session, or a washout of at least 10 min.
  - Block position is randomised and logged.
- **Outcomes.**
  - **Primary, passive:** minutes until the first self-chosen break, plus drifting and too-much marks per hour.
  - **Optional probe:** at the end of a block only, a 60 s digit span (after 3–5 practice runs).
- **Covariates:** sleep, caffeine and mood, plus time of day logged automatically.
- **Blinding.** Each trial is labelled blindable yes, partly or no. Trials that cannot be blinded rely on the objective outcome and skip the "which arm was it?" question.
- **Analysis.** A Bayesian model with a shrinkage prior centred on zero. It reports **"leaning toward A / leaning toward B / not enough evidence yet"** and has a stop rule set in advance.
- **Trials, in order:**
  1. Deep Work vs a steady bed vs silence (open-label).
  2. A noise **level ladder**, unblinded, in Explore: the user picks a level, which is then tested against no noise.
  3. Beta texture off vs on. Both arms forbid 32nd-note hats, and the harness confirms there is no 12–20 Hz peak in the off arm.
  4. Fixed arc vs arc + autonomy.
  5. Reshuffle period slow vs moderate in Deep Work.
  6. Deep Work vs Fuse **during fusion work**. Outcome: fusion checkpoints reached per session, plus minutes until the first self-chosen break. A short ASRS-6 at setup sets the starting defaults; it is not used as a covariate.
- **Emergent states.** The "unexpected effect" notes and Explore bookmarks become hypotheses with their own trials, never conclusions. A style that passes one earns the **user-discovered** badge.

## Safety

- **Calibration** (Phase 1b), keyed by `outputDeviceId` and the Windows endpoint volume, using a phone SPL app and a reference tone.
  - The setup flow tells the user to turn off enhancements and Loudness Equalization.
  - The endpoint watcher detects any change of device or volume. When that happens, the dose meter reads **"uncalibrated"** and the conservative cap applies.
  - dBA is shown as an estimate (±5 dB).
- **Dose.** WHO-ITU 80 dBA for 40 h/week, with a 3 dB exchange rate (every +3 dB halves the allowed time). The default cap is ~60–65 dBA, and going above 75 dBA needs an opt-in with a time limit. **Until calibration, a fixed ceiling of −18 dBFS applies**, and the user cannot raise it.
- **Device changes.** On a device change or lost output, fade and hold. Never resume at full level on a new device.
- **Microphone (Phase 5).** Never opened on a Bluetooth headset (it would force the headset into mono hands-free mode). It needs an explicitly chosen non-headset input with processing turned off. It can only *lower* output, and it is off during Lab blocks.
- **Visuals:** at most 3 flashes per second, and no saturated red flashes.
- **Claims:** no medical claims.

## Build phases

### Phase 0: Foundations (serial, one tree)
- `git init`; check that `git rev-parse --show-toplevel` is `cognition`.
- Scaffold with pinned versions, and strip the postinstall and builder.
- `shared/contract.ts` and the pure-conductor interface.
- **Spike A** (production build, zero CSP violations):
  - the single Faust program plays;
  - a 0.9 → 1.0 glide with τ = 60 s gets within 0.1% of target;
  - a multi-parameter commit latches on one bar, and the worklet reports `{commit, bar, frame}`;
  - full-program compile time is measured.
- **Spike B:** an offline render in Node with the same faust-args and the conductor on a virtual clock.
- **Done when:**
  - the same seed and trace give the same WAV hash;
  - the decision log is non-empty;
  - live and offline harness features agree within tolerance.
- **Fallback:** if faustwasm fails *with a correct CSP*, fall back to a hand-written TypeScript AudioWorklet DSP with the same contract.

### Phase 1a: First Listen (the beat, as fast as possible)
- The hidden audio window.
- The Deep Work layers: Sensory Guard, salience limiter and output floor.
- The minimal arranger in the pure conductor.
- **Style schema v0** (`schemaVersion`) with a file store and hot-reload watcher.
- Macros (minus Movement), Workshop with solo/mute, tap-tempo, and the **Tuning Bench**.
- The −18 dBFS pre-calibration ceiling.
- Output-device picker.
- Tray, single-instance lock, close-to-tray.
- JSONL logger.
- **Milestones:**
  - **"Good enough to work to"** (the user declares it): unblocks Phase 2 and Phase 3.
  - **"Deep Work accepted"**: tracked, but blocks only Lab trial 1 and promoting Deep Work to default.
  - After a few tuning rounds with no convergence, the optional recording shortcut is offered again.

### Phase 1b: Hardening (alongside the listening sessions)
- **Harness on offline renders** (TS, with editable defaults):
  - true peak ≤ −1 dBTP, no clipping;
  - short-term (3 s) loudness change ≤ 2–3 LU outside scheduled ramps;
  - **no onsets more than 10 dB above the local median**;
  - floor ≥ −66 dBFS RMS;
  - L/R correlation of the noise bed < 0.1;
  - conductor change rate within the budget band.

  Descriptors (LRA, tilt, onsets/min) are reported, not gated.
- **Soak suite** (8 h):
  - hidden window, display off, lock/unlock, sleep/resume, device switch, and a forced renderer crash with recovery;
  - pass criteria: underruns = 0 where `playbackStats` exists, otherwise bounded drift between `currentTime` and the wall clock; memory growth < 50 MB; CPU logged per render quantum.
- **Calibration and dose meter** (on the endpoint watcher).
- **Crash recovery.** Offer "resume session?" on next launch; never resume automatically.

### Phase 2: Lab Lite (starts after "good enough to work to"; parallel with 3–4)
- Power simulation, run-in, scheduler, arms pinned by content hash, passive outcome, optional digit span, covariates, and the leaning/not-enough summary.
- Trials 1–3, in order, as **Deep Work accepted** permits.
- **Done when:**
  - a simulated trial with an injected effect is recovered, and a null shows "not enough evidence";
  - one real block has been logged.

### Phase 3: States, routes and creation
- Settle, the Read gate overlay, Fuse, and Incubate (optional). Checkpoints come in two kinds, milestone and state.
- Route editor, named checkpoints, transition announcements, the four hotkeys plus the leader chord, the mini window, and the summary review.
- Duplicate, morph crossfader, Explore bookmarks, and the Claude style loop (JSON Schema on disk plus watcher validation; the last valid style keeps playing).
- **Done when:**
  - every state passes the harness limits;
  - property tests show morph, explore and file loads never break the safety block or the Sensory Guard;
  - the user runs a route with checkpoints without leaving their work.

### Phase 4: Autonomy
- The arc loop (breaks, re-entry, Away, suspend/resume).
- The change-budget ledger.
- Clock, idle/lock and input-activity signals.
- Passive foreground-app logging (Spike C: koffi returns distinct paths across 3 or more apps, including an elevated one).
- Hold, override, Simplify and quiet hours.
- Decision log and review.
- **Lab trial 4.**
- **Done when:**
  - simulated traces produce bounded, non-oscillating behaviour;
  - one day of real use shows decisions the user agrees with;
  - overrides always win.
- **Phase 4b**, the state machine, follows its gate.

### Phase 5: Beyond focus and extensions (each optional)
- Restore, Breathe and Wind-down.
- Mutate, Merge and the mapping UI.
- A BLE heart-rate strap (spike: chooser, RR parsing, drop/reconnect over a 2 h run), with an **HR-coupled tempo** Lab arm (slew ≤ 1 bpm/min).
- Mic level.
- Offline AI texture clips, with the **never-loop rule** extended to all sample sources and a 2–4 s chunk check for exact reuse.
- An EEG tab.
- Web MIDI.
- A Python spectral harness.
- Experimental raw input counts, only if the Lab shows they add something.

## How Claude builds it
- **Phases 0–1a run serially in one tree**, because nearly everything shares package.json, the contract, the schema and the IPC layer.
- **From Phase 1b, workflows parallelise only on leaf directories with clear owners:** `dsp/`, `tools/harness/`, `src/panel/`, `src/shared/conductor/` behind its interface.
- One integrator owns package.json and the lockfile.
- An adversarial verifier runs on the merged result, and every phase ends with a short conceptual report.
- Between by-ear rounds, Claude reads `data/feedback/` and `data/bench/` and proposes the next parameter moves.

## Risks
| Risk | Mitigation |
|---|---|
| faustwasm fails in Electron | Correct CSP and production-build test first; then the TypeScript AudioWorklet fallback with the same contract |
| Full-program live compile is slow | Measured in Spike A; if > 5 s, a dev-only multi-node mode with a shared clock input |
| Tuning by ear never converges | Two-mark milestones; Bench notes feed Claude's proposals; the recording shortcut is re-offered |
| Autonomy irritates | Default autonomy amount low; announcements with decline; Hold; trial 4 decides |
| Sensory overload | Sensory Guard, Simplify, announced transitions, quiet-first defaults, static mini window |
| Hearing | −18 dBFS ceiling until calibrated; endpoint watcher; dose meter; uncalibrated → conservative cap |
| Self-experiment fooling itself | Power simulation, run-in, pinned arms, washout, shrinkage, "not enough evidence" |
| A signal fails silently | Behavioural spike checks, registration checks, quiet glyphs for anything not working |

## Decisions confirmed (2026-10-13)

| # | Question | Answer | What it changes in this plan |
|---|---|---|---|
| 1 | "Varied contextual fusions" | Fusion is **the kind of work the user does**: combining ideas across contexts. The audio has to support that way of thinking. | **Fuse** is a *cognitive-mode state*, not a sound-blending feature. It is no longer gated, and it is built in Phase 3 (see States). The task tag "Ideate" becomes **Fuse**. Lab gains a "Deep Work vs Fuse during fusion work" trial. |
| 2 | Listening | **Headphones.** The machine shows only wired endpoints (Sound Blaster Z, Realtek) and no Bluetooth audio. | Headphone defaults: moderate width, bass mono, no hard-panned elements, optional mild crossfeed. Calibration is per headphone. The Bluetooth-mic rule remains as a guard. See *Listening chain*. |
| 3 | Checkpoints | **Both** work milestones and target mental states. | A checkpoint has `kind: milestone \| state`. A state checkpoint ("clear-headed") points at a state in the route. A milestone ("outline drafted") is free text. Both are marked with the same **Reached** key, and the review reports both. |
| 4 | Breaks | **Scheduled** by default. | Default cadence **24/6**, the tested schedule (Biwer 2023). The cue is deferrable: Deep Work keeps playing until the user goes idle or presses a key. A declined cue reschedules one cycle later. Accept/decline history tunes the cadence, and 12/3 and custom cadences are presets. |
| 5 | Lab effort | Claude's call. | The primary outcome is **passive** in every trial. A **60 s digit span** runs at the end of a block **only in trials 1 and 3**, and one key skips it. If more than half of a trial's probes are skipped, the probe is dropped for that trial. |
| 6 | A/B reference | Endel's **default** slider position. | Reference record: *Endel: Plastikman Deeper Focus (Remastered & Reduced), slider = app default*. Its exact position is noted at the first Bench session. |

### Ruling after the First Listen (2026-10-13)

The user: *"less options for customization, more simpler interface, and more varied/dynamic options all deeper focus related … the Endel one is of much higher quality, but still we have a good base"*, and *"save the current one … it's not bad for a reference point"*.

| What changes | How |
|---|---|
| The interface | One main screen — Play, Gentle start, the variations (or **Auto**), one **Character** dial (Ambient ↔ Techno, Endel's own 2026 axis, global), Volume. Every other control moves behind **Studio**. |
| Variety | Deep Work becomes one of a **family** of five variations, all minimal techno in the Deeper Focus character, ordered from the ambient end to the techno end. **Auto** roams to a neighbour every 10–18 minutes by slow morph. |
| Dynamics | Sections replace the 8-minute reshuffle: one small move (rotate a layer, vary a pattern, drift a value) every 1–2 minutes, always as a slow fade, inside the change budget. |
| Quality | Engine v2: the instruments are rebuilt (see progress). The harness gates are unchanged. |
| Reference | The First Listen sound is frozen and playable (`first-listen`), pinned bit-for-bit by a test. |

## Listening chain (found during final preparation)

The machine has two output stages that change sound **system-wide**:
- **Sound Blaster Z.** Its SBX effects (Surround, Crystalizer, Bass, Smart Volume, Dialog Plus) can apply EQ, widening and automatic gain.
- **FxSound Audio Enhancer.** A virtual output device that adds EQ, ambience and "dynamic boost", which is a form of compression and loudness enhancement.

Both would distort what tuning by ear hears and what calibration measures. Smart Volume and dynamic boost also fight the engine's own loudness design.

Rules:
- **During Bench tuning and calibration,** Endel and the engine must play through the **same** endpoint, with FxSound bypassed or not in the path and all SBX effects off. The engine pins its output with `setSinkId`. The Bench shows the endpoint it is using, and the reference record logs it.
- **After tuning,** the user may turn the enhancers back on for everyday listening if they prefer. But calibration is only valid for the chain it was measured on, and the endpoint watcher marks the dose meter "uncalibrated" if that chain changes.
- **Confirmed by the user:** FxSound is the Windows default, and its output goes to **Speakers (Realtek(R) Audio)**. The headphones are on the onboard Realtek jack, and the Sound Blaster is not in the path.
  - The engine's Bench sink is pinned to **Speakers (Realtek(R) Audio)**, which bypasses FxSound.
  - For A/B and calibration, the user turns FxSound off, so Endel also reaches Realtek directly. Both sources then share one unprocessed path.

## Readiness (checked 2026-10-13)

- Node 24.21.0 and npm 11.19.0 are present.
- These exist on npm at the pinned versions:
  - `electron@44.7.1`
  - `electron-vite@5.0.0`
  - `@grame/faustwasm@0.19.0`

  Current versions: `koffi` 3.3.3, `zod` 4.6.7, `vitest` 5.0.4, `react` 19.3.0. Phase 0 pins all of them exactly.
- Windows PowerShell 5.1 is present, which the endpoint watcher needs. git 2.53.
- Disk: C: has 39 GB free, enough for the toolchain plus renders of 1–2 h or less. D: has 11 GB free and is not used.
- `winget` is not on PATH. It is only needed for `uv`, which is deferred.
- `cognition/` is still inside the home-folder git repo. Phase 0 step 1 makes it its own repo.

### Phase 0 opening moves (on "go")
1. `git init` in `cognition/` and verify show-toplevel. Then `.gitignore` (`data/`, `node_modules/`, `out/`, `renders/`), and commit research and plan.
2. Scaffold electron-vite (React-TS) into `app/`. Pin exact versions, then strip the `postinstall`, electron-builder and updater.
3. Write `src/shared/contract.ts`, the conductor interface, and the seeded PRNG.
4. Spike A: a minimal Faust program with a seeded noise generator, a 60 s glide and a commit-latched parameter, run in the hidden audio window under a production build.
5. Spike B: the offline render in Node with the pure conductor, plus the determinism and parity checks.
6. Report the Phase 0 results, then move to Phase 1a.

## What changed from v1 (review log)

### Structure
- Phase 1 is split into **First Listen** and **Hardening**, so the user hears the beat before any infrastructure that isn't the beat.
- The **Lab moved forward** to Phase 2 and runs in parallel with later phases. Previously it came last.
- The Phase 1 exit is two milestones: the by-ear match no longer blocks the build.
- Schema, file store, logger, conductor and contract moved into Phases 0–1. In v1 they arrived after the things that needed them.
- Serial build until the contract is stable, then parallel builders on leaf directories only.

### DSP
- One superset Faust program compiled with `-double -ftz 2`. In v1 there were several nodes, and float32 glides stopped short of their targets.
- Atomic bar-latched commits, with the worklet reporting when each change was heard.
- Seeded and decorrelated noise. Faust's default noise is identical on every run.
- The conductor is pure and bar-clocked, so offline renders include the arrangement.
- The salience limiter is reframed as three stages that bound salience rather than guarantee against it.
- The floor is respecified against Chromium's RMS test, and `powerSaveBlocker` is the main keep-alive.
- Tempo changes latch to the bar, and the dub delay is made safe.
- The modulation rate is clamped by the non-mutable safety block.

### Platform
- The audio runs in its own hidden window, so closing the panel or a reload no longer kills the music.
- `uiohook-napi` (a global keyboard hook) is dropped in favour of powerMonitor-derived input activity. `get-windows` (which fails silently) is replaced by koffi.
- There are no native compiles at all. Electron and electron-vite are pinned, and the template's builder and postinstall are removed.
- The CSP is fixed for faustwasm.
- The mini window no longer steals focus.
- Hotkey registration is verified: 4 defaults plus a leader chord.
- Tray, single-instance lock, crash recovery, and suspend/resume and Away handling are added.
- The endpoint watcher ties calibration to the device and Windows volume. The microphone never opens on a Bluetooth headset.

### Fidelity to the research
- The Read gate is an overlay defined on changing tokens. v1's version would have banned the kick.
- The change budget has units, a single ledger, and a minimum as well as a maximum.
- The break cue is now perceptible, with a decline path.
- Overloaded is driven by the hotkey, because there is no valid passive arousal signal.
- The novelty gate is replaced: v1's "95th percentile" rule could never pass.
- Thresholds are given as editable numbers.
- The ramp-in and re-entry parameters were aligned with the research.
- The modulation trial controls for hats.
- The noise trial uses a level ladder.
- Heart-rate-coupled tempo is added as a Phase 5 arm.
- The reference is pinned.

### Fit to the user
- The Tuning Bench and note hotkey are added for the by-ear loop.
- The Sensory Guard is added; "too much" now acts (Simplify); autonomous transitions are announced.
- The mini window is static text.
- Review is a summary in words.
- Bandit and preferential BO removed.
- The panel and creation tools are slimmed to duplicate, morph, explore and the Claude loop.
- Eight initial states cut to Deep Work, Settle, the Read gate and gated Fuse.
- The Lab burden is cut to a passive outcome, one trial at a time, with a power simulation.
- Manual controls are freed from the quiet-first rule.

### Rejected
One issue: Playwright Electron "experimental" status. The plan already keeps the UI smoke test thin.
