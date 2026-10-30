# Progress

## Phase 0 — Foundations (done, 2026-10-13)

- Own git repo; electron-vite 5.0.0 + Electron 44.7.1 (Chromium 152, Node 24.21), pinned.
  No builder, no postinstall, no native compiles.
- **Parameter contract** (`src/shared/contract.ts`, `dsp/cog.lib`): staged values, commit
  bumped last, atomic latch on the next bar line (or next sample for manual control),
  exact linear ramps in double precision, bar-latched tempo, seeded decorrelated noise.
- **Pure conductor** driven by bar ticks; the same `CommitQueue` delivers batches live
  and offline.
- Results: 60 s ramp arrives exactly; multi-param batches latch on one sample on the bar
  line; same seed + trace → identical hash; Chromium AudioWorklet render **bit-identical**
  to the Node render; zero CSP violations under the production build; full-program compile
  1.6 s (no multi-node fallback needed).

## Phase 1a — First Listen (built, awaiting the by-ear milestones)

- `dsp/deepwork.dsp`: kick, sub, identical-token hats, rare perc, dub stab + delay,
  drifting pad with optional beat-locked AM (8 cycles/beat, ≤ 20 Hz), seeded noise bed,
  short room, M/S width, headphone crossfeed, guard stage, lookahead limiter, keep-alive tone.
- `styles/deep-work.style.json` (schema v1): macros, arrangement (3-min ramp-in, reshuffle
  every 8 min within a change budget), Sensory Guard, non-mutable safety block.
- App: hidden audio window, panel (Session, Macros, Workshop with mute/solo and 16-step
  pattern grids, Bench, Log), tray with close-to-tray, single instance, global hotkeys,
  JSONL logs, output pinned to Realtek, −18 dBFS pre-calibration ceiling, style hot-reload.
- Tuning Bench: A/B engine fade, tap tempo, notes with full parameter snapshot,
  snapshots A/B/C, checklist, reference record, milestones.
- Verified: 29 offline tests; Electron self-test (live worklet, bars, batch landing, CSP,
  device labels, bit-identical parity on Deep Work); silent end-to-end session (ramp-in
  decisions landed on their bars; manual and macro changes reached the DSP; stop suspends).

### Deviations from the plan (and why)

- Single npm package at the repo root (not `app/`): tools must resolve the same node_modules.
- The keep-alive group is named `keepalive`, not `floor`: a Faust 2.90 compiler assertion
  fires on a UI group named `floor`.
- Output-device changes made while the AudioContext is suspended are applied right after
  `resume()`: in Chromium 152, `setSinkId` on a suspended context wedges `resume()`.
- Mute/solo are session-only (never written into a style).

## Phase 1a.2 — Simple & varied (built 2026-10-13, at the user's request)

After the first listen the user ruled: *fewer customisation options, a simpler interface,
more varied and dynamic options, all Deeper-Focus related; Endel's is much higher quality,
but this is a good base; keep the current one as a reference point.*

- **Reference point.** The First Listen sound is frozen: git tag `first-listen`, plus a
  playable copy — `dsp/firstlisten.dsp`, `firstlisten-conductor.ts`,
  `styles/first-listen.style.json` (`frozen: true`). A test pins it bit-for-bit to the
  hash the original engine produced; the audio window swaps engines in place.
- **Engine v2** (`deepwork.dsp`) — the quality gap measured on v1 was a hollow middle
  (almost nothing between 500 Hz and 4 kHz), a near-mono image, and a limiter clamping the
  kick. v2: kick with click and saturation; 808-style metallic hats (six square waves) with
  true-stereo noise; open hat; clap; rim/tom perc; a 303-style acid line (ladder filter,
  slides, accents, a slow bar-locked sweep — timbre moves, pitch mostly does not); detuned
  stereo dub chords through a 4-pole filter; a richer breathing pad; a sweeping band of air;
  kick-keyed ducking; ping-pong tape delay with wow and flutter; mono bass; bus glue and
  tape saturation; tempo changes glide (0.2 bpm per bar). Seeded walks under every layer
  (`motion/amount`). Result: pink-like tilt, a full middle, real width above the bass, the
  limiter idle in normal play.
- **The family** (`styles/family.json`): Low Light · Dub Chamber · Deep Work · Acid Drift ·
  Tight Pulse, from the ambient end to the techno end, level-matched to −29 LUFS.
- **The arranger** (`arranger.ts`, replaces the v1 conductor for the live engine): one small
  move per section (32–48 bars) inside the change budget — rotate a layer in or out (a
  16-bar fade), vary a pattern, or drift a value; protected layers never leave. About one
  change a minute or two instead of one per 8 minutes. **Morphs**: continuous values glide
  together over 32 bars; discrete ones switch one at a time, silent layers first, leaving
  layers last. **Auto** roams to a neighbour every 10–18 minutes.
- **Simple main screen**: Play, Gentle start, Auto + the five variations + the reference,
  one Character dial (Ambient ↔ Techno, global), Volume (a trim over the calibrated
  levels). The old tabs live behind **Studio**; the tray menu can switch variation.
- Verified: 77 offline tests (style documents, macros/guard/safety, the arranger's rules
  for an hour of every variation, morphs and Auto; rendered hard limits for every variation,
  the ramp-in, a neighbour morph and the widest morph; the frozen reference's hash);
  Electron self-test 9/9 (adds the in-place switch to the reference engine); silent
  end-to-end lap (Auto ramp-in on its bars, a pick that morphs, both dials, reference and
  back, stop).

### Deviations and open points

- The section pace (a move every 1–2 minutes) is faster than the plan's 10–15-minute
  reshuffle. The user asked for more dynamic; every move is still a slow fade inside the
  change budget, and the harness gates (no deviants, ≤ 3 LU steps) hold. This is the
  research's habituate-vs-refresh axis — tune by ear.
- The engine costs about 3.5× realtime in Node (v1: 7.7×) — fine for the AudioWorklet;
  watch for underruns in Phase 1b's soak.
- Volume is now a per-device trim over each variation's calibrated level
  (`volumeDbByDevice`), replacing the per-device master override.

## Phase 1a.3 — Ten variations (built 2026-10-14, at the user's request)

The user asked for five more Deep Work options: *some slower, some faster, some with more
clicks or drums, some with less*.

- New: **Still Water** (slowest, barest: half-bar heartbeat kick, almost no drums, suspended
  chords), **Undertow** (slower, rolling offbeat sub), **Clockwork** (more clicks: sixteenth
  ticks at many velocities, a wood knock in threes against the four), **Machine Room** (more
  drums: open hats, clap, rolling toms), **Night Drive** (fastest: offbeat sub, running acid).
- The family order is now also a tempo order, slowest to fastest, with small steps between
  neighbours, so every Auto move is a small change of tempo (a test holds this).
- No engine change: the five are new style documents over the same engine, level-matched to
  −29 LUFS like the rest. Clockwork's knocks first drove the bus compressor and collapsed the
  stereo image; they now sit lower and wider, and the click range stays a little forward.
- Main screen: the variations sit in two columns (ambient/slower → techno/faster); the two
  dials sit side by side; the panel window is 920 px tall.
- Tests follow the family file (118 offline tests); Electron self-test and end-to-end lap pass.
- By ear: Still Water is deliberately the darkest (little above 2 kHz), and Clockwork is the
  brightest; both are worth a listen against the rest.

## Phase 1a.4 — Ten states (built 2026-10-14, at the user's request)

The user asked: *each of the ten should have different ambient aspects, each nuanced in its
application to cognition, with more build-up and addition; Deep Work is a good base.*

- **A job each**, named from the plan's states and the research's state table: Still Water
  **Settle**, Undertow **Read**, Low Light **Incubate**, Dub Chamber **Fuse**, Clockwork
  **Detail**, Deep Work **Deep**, Acid Drift **Flow**, Tight Pulse **Execute**, Machine Room
  **Energise**, Night Drive **Sprint**. Each style carries `use` (name, what it is for, why
  the sound fits, with the evidence strength), shown on the main screen.
- **Deep Work's core under all ten**: every document starts from Deep Work's params; the
  differences are the job's (tempo, density, pitched content, space, change budget).
- **Read keeps to the Read gate**: no acid, chord stabs, glass or wood; one bass note
  (`sub/motion` 0) and identical ticks; only masks vary. A test holds it.
- **An ambient world each** — new engine voices, each off unless a variation asks: rain on
  water (drops that rise as the bubble closes, over a wash), a beating drone, distant glass
  bells on chord notes, tape dust and hiss, machine hum with duct rush, passing lights (a
  single source crossing the field); plus wind that follows the acid sweep and gusts. All
  seeded; none loops. Each variation opens with its own (a test holds that every first
  element differs). The Character dial's ambient end lifts them a little.
- **Build-up and addition** (schema v3, replacing intro + rotation): a build is an ordered
  list of elements. The foundation arrives in order within `foundationMinutes`, the free
  elements in a seeded order by `minutes` (5–16 by variation); only `top` play at once.
  Between tides the body adds and drops one free element at a time (`wobble`). Tides
  breathe out one element at a time, newest first, down to a floor, then build back in a new
  order (every 14–40 minutes by variation; Settle has none). A pick carries the number of
  playing elements over and keeps building. Every step is a fade inside the change budget.
- Engine cost: about 2.4× real time in Node (was 3.6×); the ambience voices share one
  random stream each and use recursive envelopes to keep it there.

### Deviations and open points

- The research's focus signature lists "no song form (no builds, drops or climax)" — marketing
  evidence only. The user asked for build-up; it is built as addition without climax: no
  risers, no drops, every element a slow fade, and a tide is a slow breath, not a breakdown.
- Ambience levels were set by measurement against a target place in each mix (rain ~9 LU
  below the mix; a sparse glass voice ~15 below), not by ear.

## Phase 1a.5 — Five kept, five reworked (built 2026-10-15, from the user's first listen)

The user listened to all ten (at full texture, "Skip"): **Low Light, Deep Work, Dub
Chamber, Machine Room and Acid Drift are good bases**; the other five were too punchy or had
strange, not-nice effects, and were to be reworked completely.

Measured against each other, the two groups split cleanly:

- **The bed carries the drums.** Every kept variation has a warm tonal layer (pad, chords,
  acid line or hum) within about 11 LU of the mix. Clockwork and Tight Pulse had none to
  speak of: bare drums, and Clockwork's knock in threes stood ~27 dB out of the mid band
  (the kept five: 5–17).
- **No effects.** The rejected five each carried an event-like ambience: sine-ping raindrops
  (Still Water, 9 LU under the mix), a resonant swoosh every few bars (Night Drive), crackle
  and loud hiss (Clockwork, Tight Pulse, Night Drive), a beating sine drone (Undertow). The
  research had already said it: new elements never arrive as events.

Built:

- **The kept five, as heard.** Deep Work and Machine Room render sample-identical on the new
  engine. Small touches only: Low Light loses its crackle element (beyond its top, so it had
  not yet played), Dub Chamber's ticks sit 1.5 dB further back (they were the family's
  loudest), Dub Chamber's glass drifts in how much it feeds the delay, and Acid Drift's wind
  wanders in how gusty it is.
- **Five reworked**, jobs kept, sound new: **Shoreline** (Settle: the sea at a slow breathing
  pace, no kick), **Rainfall** (Read: steady rain, a held chord, identical tokens), **Quiet
  Room** (Detail: almost no ambience on purpose, close and dry), **Daylight** (Execute: high
  light, a bright open chord, an even rolling bass), **Night Road** (Sprint: tyres and an
  engine's purr, the road moving with the acid sweep).
- **Engine:** the sea (slow swells, each its own size, over a distant wash), rain redesigned
  as a fused steady-state patter (no pitched drops), high light (open fifths far above, each
  swelling on its own clock); the drone, the swoosh and the crackle are gone.
- **Two rules held by tests:** a tonal bed in every foundation; nothing spikes out of the mid
  band harder than the kept five (`bandSpike`).

## Phase 1a.6 — Deep Work studies (built 2026-10-16, at the user's request)

The user asked: *keep the current Deep Work, and add five more variations of Deep Work; be
creative and innovative about how sound relates to deep work and cognition, using dual coding
theory and frequency as the frame, with correct inference, because much of what circulates is
false.* Also two documents: `current-state.md` and `how-the-ai-works.md`.

- **Research, checked first.** Two research passes checked ~40 claims against primary
  sources. Corrections that changed the design:
  - The spatial version of the irrelevant-sound effect failed to replicate, so the "no
    changing sequences" rule protects *verbal* work.
  - Legato music does not disrupt verbal memory where staccato does; continuous glides do
    not where gapped ones do.
  - Noise costs listeners without attention difficulties slightly (significant).
  - Dual coding is about codes, not senses, and is not "learning styles".
  - "Frequency" claims split into five separate things (absolute pitch, ratio, modulation
    rate, band, register). Only some are real.
- **Five studies** (`family.json` → `studies`): shown below the family on the main screen,
  never part of Auto. Each is Deep Work (same key, tempo, groove, space) changed in one way:
  - **Unbroken** (Write): nothing segmented but the kick.
  - **Middle Distance** (Design): a four-part chord whose inner parts dissolve to new notes,
    top fixed, no scenes.
  - **Overtones** (Hours): one harmonic-series tone, kick tuned to the root, nothing beating.
  - **Flutter** (Hold): 16 Hz beat-locked flutter on pad and chords, arriving as an element.
  - **Shelter** (Shield): a tuned-noise veil over the speech-intelligibility band.
- **Engine.**
  - Three beds: `series` (harmonic partials at exact ratios, each on its own slow clock),
    `parts` (four held parts; each change a crossfade between two slots, never a glide) and
    `veil` (pink noise through narrow bands on the minor chord's notes, F3–F6, over soft air
    across 0.7–4.5 kHz).
  - New controls: `sub/hold`, `space/duckShape` (a smooth beat-locked breath),
    `space/duckAttack`, `noise/pump`, `beta/chords`.
  - The parts' notes switch on the latch (they are discrete params).
- **Cost.** About 1.6× real time in Node (the 1a.5 engine measures 2.1–2.4× on the same
  machine and day). The first version of the beds was 1.4×. It was brought back by:
  - working out tuning and clock rates once per block (table ratios, the root read
    directly by the veil, the series' bloom unramped);
  - sharing one duck envelope;
  - fewer partials and bands.

  Watch for underruns in Phase 1b's soak. If they appear, compute silent layers on demand.
- **The existing ten are unchanged in sound.** Old and new engines differ only in
  floating-point rounding, because the compiler regroups sums when voices join the mix. The
  largest difference is more than 140 dB below the music.
- **New metrics** (`modulationIndex`, `bandShare`) and **a law per study, held by tests**
  (`studies.test.ts`):
  - Unbroken's speech band fluctuates at the syllable rate far less than Deep Work's.
  - Overtones' bed, heard alone, beats far less than Deep Work's pad.
  - Flutter's pad flutters at 12–20 Hz several times as much as Deep Work's.
  - Shelter's speech band (1–4 kHz) is never empty: its quietest moments sit far above
    Deep Work's, whose energy there comes only in bursts. It is no brighter than the kept
    five.
  - Middle Distance's chords are free of rubs and its top part never moves.
- **Tests now cover family and studies alike:** the bed rule, the builds, an hour of the
  arranger, and every rendered harness limit.
- **Spectrograms as a second check.** Claude now renders spectrogram images and reads them.
  The first veil looked like broad haze, i.e. hiss. It was narrowed into pitched breath,
  and its masking moved into a soft air band whose brightness stays inside the kept five's
  range.

### Waiting on the user

- By-ear sessions with the family against Endel (and First Listen) →
  **Good enough to work to** (unblocks Phases 2–3) and, later, **Deep Work accepted**.
- A listening round through the five rebuilt variations and the five studies.

## Phase 1a.7 — Field: a second engine, three worlds, seven styles (built 2026-10-22)

The user asked for large dimensional shifts and more variety in cognitive styles, in how it
sounds; sound first, everything else secondary. Planned and built in one stage. The plan is
`plan/sound-dimensions-plan.md`; the research behind it is
`research/sound-cognition-research.md`.

- **The diagnosis.** Since the studies, the logs show almost nothing but Deep Work (one
  session of about fifteen hours); the studies and reworked five were tried for seconds.
  Every variation sat in one corner of sound: a kick-carried pulse at 98–128 bpm, one key
  (F), one dark colour, one synth kit, one room.
- **The engine finding.** In one Faust program a silent voice costs as much as a playing one,
  and on-demand computation is not available in the WebAssembly back end (tested). The Pulse
  engine's idle ambience and study beds take about half its CPU. So new worlds go in a new
  program: **engines**, one per program, only the playing one computed.
- **Field engine** (`dsp/field.dsp`, shared blocks in `dsp/engine.lib`; Pulse untouched):
  - **bank**: four held voices; each note change is a crossfade between two slots (never a
    glide); L and R detuned opposite ways; one shared breath, so the bed fuses;
  - **drone** (root, octave, fifth), **glow** (the root's harmonic series far above, each
    partial on its own clock and place), **breath** (pitched air on open intervals);
  - **bloom**: six loops of incommensurate length (every ratio ≥ 1.75% from any simple
    ratio up to fifths), each striking a felt/bar tone from a palette (pentatonic, chord,
    whole mode); a loop keeps its note or wanders;
  - **lattice** and **phase**: one twelve-step figure in two lines, the second `lag` steps
    behind; `lag` ramps, so the line slides out of phase and locks one step later;
  - mallet tones whose envelope starts from where it is (a voice struck while ringing never
    clicks), a large dark room, a ping-pong delay, and the same guard, limiter and floor;
  - **harmony as a mode on a root**, on the **colour ladder** (Phrygian → Aeolian → Dorian →
    Mixolydian → Ionian → Lydian), each rung one note from its neighbour;
  - about a sixth of a core with everything playing (Pulse: about three fifths).
- **Seven styles** on one root (D), the line Auto walks: **Tide** (Recover) · **Still**
  (Read) · **Ink** (Write) · **Garden** (Reflect) · **Wander** (Ideate) · **Build** (Build) ·
  **Run** (Routine). Drift is Tide, Still and Ink; Bloom is Garden and Wander; Lattice is
  Build and Run. Each `use.why` names the research rules it rests on.
- **Arranger: the shift move.** A style lists ladders (`arrangement.shifts`); a shift steps
  one rung up or down. Discrete params switch on the bar (the engine crossfades the voices);
  continuous ones slide over `shiftRampBars`. Existing styles have shift weight 0: Pulse
  behaves exactly as before.
- **Lines** (`family.json` → `lines`): another engine's styles in Auto order, with their own
  Auto (`auto:field`). A pick in another engine fades across, as First Listen does.
- **App:** the main screen has a Field section with its own Auto; the Studio's Workshop shows
  the playing engine's elements; the Character dial reads as stillness ↔ motion in Field
  (loops slow or quicken, the lattice thins); nothing gets louder.
- **Measured** (75 s at full texture, through the arranger): all seven at −29 LUFS like the
  family; no loudness step over 1.7 LU; no deviant onset; the sharpest tone 2.6–4.3 dB out of
  the mid band (kept five: 5–17); real stereo; Drift's syllable-rate flutter in the speech
  band about a seventh of Unbroken's. Field is darker on top than Pulse (no ticks) and fuller
  in the low mids; it has less sub (no kick).
- **Laws held by tests** (`tools/render/field.test.ts`, plus every family law extended to
  Field): Drift never strikes; nothing in Drift stands out of the bed; its flutter is under
  half of Unbroken's; Bloom's loops are pairwise incommensurate and its tones never stand out;
  Lattice's offset only slides, one step at a time, never through unison; every colour shift
  is one rung, and neighbouring rungs differ by one note; every reachable chord is free of
  rubs; Auto walks the line one neighbour at a time and blends between worlds without a
  loudness jump or a deviant.

### Waiting on the user

- **A first listen to Field**: which worlds are places to be, which are not, in the same
  words as before ("good base", "punchy", "strange").
- The open choice in the plan: journeys for Pulse (the tide carries the key), which touch
  the kept sound and wait for a yes.
