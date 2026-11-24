# Computation: taking the work off the listening machine

*24 November 2026. Why Cognition's computing cost has to come down, what I measured, and
where the work goes next. As with the rest of the project, I set the direction and judged
the results; Claude ran the builds and measurements (see
[`plan/how-the-ai-works.md`](../plan/how-the-ai-works.md)).*

## Summary

Cognition makes its music live. Every sample you hear is calculated while you listen, which
cost about **72% of one CPU core and 334 MB of memory** on my desktop. A focus app that eats
most of a processor core is working against the job it was built for: it heats the
laptop, drains the battery and competes with the work it is meant to support.

My conclusion was that trimming is not enough. **The calculating has to be separated from
the listening**, so that the machine you listen on mostly just plays sound. Products like
Endel are cheap to run on the device because the heavy sound design is done ahead of time,
and the device only sequences and mixes the results.

So far:

1. **Reduced in place:** the app is down to about **50% of a core and 206 MB**, with no
   audible change. This is committed.
2. **Measured the options:**
   - A native build of the same engine runs **1.6x faster** and is sample-for-sample the
     same sound.
   - The engine wastes up to two thirds of its time on work that can be removed.
   - Plain playback of the same music costs **under 1% of a core**.
3. **Chose the direction:** move synthesis out of the listening process, either to a
   server that streams the sound, or to an offline step whose output (stems) the device
   only mixes. Local optimisation continues as the fallback for offline use.

## 1. Where the cost comes from

There are two separate costs with two separate causes.

**CPU is synthesis.** There are no recordings in Cognition. Every sound (kick, bass, pad,
rain, the room) is a formula written in [Faust](https://faust.grame.fr/) in `dsp/`. The
engine produces 48,000 samples a second for each of two channels, and every sample passes
through every voice, filter and the reverb. Filters and reverb feed their own output back
in, so each sample depends on the one before it. That is why the work can't be spread over
several cores or handed to a graphics card. The cost scales with voices × work per voice ×
sample rate.

**Memory is the browser.** The app is built on Electron, which is a full Chromium browser:
a main process, a hidden window that hosts the audio engine, the panel window and helper
processes, each with its own JavaScript runtime. The engine's own state is about **4.4 MB**
(measured, below). Nearly everything else in the 206 MB is Chromium.

So the two costs need two remedies. CPU only drops by computing less, computing more
cheaply, or computing somewhere else. Memory only drops much by not running a browser while
you listen.

## 2. Step one: reduce in place (done)

Committed on 24 November 2026.

| Measure (i5-9400F, Low Light playing) | Before | After |
|---|---|---|
| Whole app, CPU | ~72% of one core | ~50% of one core |
| Whole app, private memory | 334 MB | 206 MB |
| Engine alone, offline | 79% of one core | ~40% of one core |

The whole-app figures were taken during the app's silent end-to-end lap, which also opens
the panel; the engine figures come from `npm run bench`.

What changed:

- **Control ramps.** Every continuous control used to recompute an exponential curve on
  every sample. Now it steps toward its target with one addition per sample (`rampTo` in
  `dsp/cog.lib`).
- **Decibel table.** Levels were converted from decibels with `pow(10, x/20)` per sample.
  They now use a lookup table in 1/64 dB steps (`dbLin`).
- **The panel.** Hardware acceleration is off, since the panel is a few dials. Status
  updates go only to a visible panel. Closing the panel frees its window.

**How I know the sound didn't change:**

- **Null test.** The old and new renders were subtracted; what is left is at least 117 dB
  below the music, far below hearing.
- **First Listen is untouched.** Its golden hash still matches bit for bit.
- **Checks pass.** All 290 tests and the self-test pass. The self-test proves the live app
  is bit-identical to the offline renderer.

## 3. Step two: measure the alternatives

All numbers below are Low Light (the heaviest kind of variation) on the same desktop,
rendering 20 seconds offline, best of three runs. Runs vary by a few points with machine
load, so comparisons are always made in the same session.

### A native engine instead of WebAssembly

The same Faust code was compiled to C++ (Faust 2.88) and built with Zig/Clang at a portable
CPU level (`x86_64_v2`) with strict floating point. It was fed exactly the same parameter
stream as the WebAssembly engine, and the outputs were subtracted.

| Engine | CPU, one core | Difference from the WebAssembly render |
|---|---|---|
| WebAssembly, as shipped | 36.9% | reference |
| Native C++ | **23.0%** | peak −168.6 dBFS: the same sound to the last bit of float precision |
| Native C++ with AVX2 (`x86_64_v3`) | 22.9% | same |

- **Speed.** Native is about **1.6x faster** in the same session.
- **Vector instructions.** AVX2 adds nothing. The feedback loops are sequential, which
  matches the reasoning in section 1.
- **Version gap.** The two outputs agree even though the native build used an older Faust
  (2.88, against 2.90 for WebAssembly).

Reproduce with `tools/native/` (instructions at the top of `harness.cpp`).

### Things that did not help

- **Single precision (32-bit) is slower and unsafe.** In WebAssembly it took 54.6% against
  33.4% for double precision in the same session. The bar clock and long glides also need
  64-bit state: in 32 bits a slow filter drift would stop moving and bar positions would
  shift.
- **In-code denormal flushing (`-ftz 2`) costs about 11%** (33.4% with it, 29.8% without).
  Without it, the Low Light render is bit-identical. A native engine gets the same
  protection for free from a CPU flag. Removing it from the WebAssembly build would need
  First Listen's hash re-checked first, so it is noted rather than changed.

### Work the engine does that it doesn't need to

These are profiling variants (`npm run bench -- --variant …`), 12-second renders. They
are ceilings, not achievable savings.

| Variant | CPU, one core |
|---|---|
| As shipped | 37.8% |
| Controls updated once per block (128 samples) instead of every sample | 22.6% |
| Layers this variation never plays removed | 19.8% |
| Both | 12.8% |

The second row is the striking one. A silent layer is muted after its sound has been
computed, so it costs as much as an audible one. Removing that waste needs restructuring,
and per-block controls change the sound very slightly, so each change gets a null test and a
listen. For comparison, a Field world (Garden) costs 13.4% as shipped.

### What listening alone costs

The same Low Light audio was played as a file by a separate process, measured the same way:
**0.8% of one core.**

## 4. The deduction

| How the sound reaches the ear | CPU on the listening machine |
|---|---|
| Today's engine, live | ~37% (engine) / ~50% (whole app) |
| Native engine plus the DSP clean-up (estimate: gains of 1.6x and up to 3x combine) | roughly 8–15% |
| Playing finished audio | **under 1%** |

Even the best local engine leaves the listening machine doing ten or more times the work of
simply playing sound. Reduction is worth doing, but separation is the step change. That is
the conclusion I drew, and the rest of the plan follows from it.

This is also how Endel works:

- **Pre-designed stems.** Its sound team designs the sound elements ahead of time
  (stems, or a "sound pack").
- **Sequencing on the device.** An algorithm on the device picks and sequences those
  stems in real time from inputs such as time of day and weather
  ([endel.io/technology](https://endel.io/technology),
  [TechCrunch, 2022](https://techcrunch.com/2022/05/20/endel-sony-partnership/)).

The device is still generating, but it is arranging finished audio, not synthesising every
sample.

## 5. Three ways to separate the work

### A. Stream from a server (cloud engine)

The engine runs on a server and the app plays a stream.

- **Ready to run headless.** The offline renderer already runs the engine headless,
  bit-identical to the app, so it is the server engine in waiting.
- **Latency is already absorbed.** Every change in Cognition lands on the next bar line
  (a bar is about two seconds at 120 bpm), so the round trip to a server fits inside a wait
  the music already has.
- **Listening machine:** playback only, under 1% CPU. Nothing is lost: never-repeating
  sound, all dials, Auto.
- **Costs:**
  - an always-on server;
  - an internet connection while listening;
  - about 43 MB an hour per listener at 96 kbps;
  - server CPU per listener of roughly 0.25 of a core with the native engine (estimate:
    about four listeners per core), less after the DSP clean-up.

### B. Render ahead, mix on the device (the Endel model)

Synthesis happens once, offline. The device sequences and mixes finished stems.

**Why this suits Cognition:**

- **The main dial is already a mixer.** In the Pulse engine, the Ambient ↔ Techno dial
  mostly moves layer levels: drums down 30 dB at the ambient end, pad and room up a little
  (`src/shared/style/macros.ts`). A player can do that by fading stems.
- **The shared room reverb adds up correctly.** It is linear, so stems rendered with
  their share of the room sum to the full mix.
- **The kick-keyed ducking stays right.** It follows the kick's timing, which is the same
  in every stem.

**What has to change:**

- **The limiter.** The final lookahead limiter is not linear, so it moves into the player
  (a light, cheap one).
- **Long-term evolution.** Slow changes such as tides and filter sweeps either stay
  baked into long stems or are approximated.
- **Storage.** A finite library takes storage: about 43 MB an hour per stereo stem at
  96 kbps, so stems are grouped (for example drums, bass and acid, harmony, ambience).

**Result:** no server cost per listener, works offline, a few percent of CPU at most.

### C. A local native engine (fallback)

The same engine, compiled natively, runs in a small process with no browser while you
listen.

- **Gain:** measured at 1.6x on CPU. Memory is estimated to fall to tens of megabytes
  rather than hundreds.
- **Status:** the fallback for offline, full-fidelity use. The full plan, with pass/fail
  thresholds fixed before measuring, came out of a structured review of the approach.

## 6. What happens next

1. **Prototype A first.** It needs the least new invention, because the headless engine
   and the bar-line contract already exist. The open choice is where to host it.
2. **Then B for offline use and zero server cost.** Render Pulse variations as grouped
   stems and build a light mixing player. The dial-to-stem mapping and the player's
   limiter are the design work.
3. **Keep C and the DSP clean-up as the floor.** They also make A cheaper per listener,
   because server cost is the same engine cost.

Each step keeps the measurement discipline that runs through this project:

- the offline render is the reference;
- every change is null-tested against it;
- First Listen stays bit-exact;
- the sound is judged by ear before it ships.
