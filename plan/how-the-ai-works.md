# How the beats get made: the AI's side

*16 October 2026. How Claude, the AI building cognition with you, makes, understands, edits and
extends the beats: first in broad terms, then step by step.*

## The short version

I cannot hear. I have no ears and no audio input. Everything I do with the beats goes
through three substitutes for hearing:

1. **Reading the engine as mathematics.** Every sound in cognition is code: an oscillator, a
   filter, an envelope, a random walk. I can read that code and know what signal it makes,
   the way you can read a recipe and know roughly how it tastes.
2. **Measuring renders.** I render a variation to numbers, offline, and measure it:
   loudness, peaks, how hard hits stand out, how each layer sits in the mix, how fast the
   level fluctuates.
3. **Your words.** "Punchy", "strange offbeat effects", "good base", "keep Deep Work". These
   are the only ground truth. Everything else is a proxy for them.

So the division of labour is fixed: **you are the ear, I am the hands and the instruments.**
The system is built so the instruments are exact. The offline render I measure is
bit-identical to what the app plays you, so a number I report is a fact about the sound you
will hear, not an estimate of it.

## High level: the loop

```
  your ears ──► your words ──► my reading of them (which features could cause this?)
      ▲                                   │
      │                                   ▼
  the app, restarted        measurement: render the variations offline, compare the
  on the new version        ones you kept with the ones you rejected, find what
      ▲                     separates them
      │                                   │
      │                                   ▼
  verification ◄── changes ◄── rules (written down as tests, so they cannot drift)
  (tests, the self-test,      (engine code, style documents, the arranger)
  "nothing else moved")
```

Each lap of the loop turns one of your verdicts into a **rule the system enforces**, and the
rules accumulate. That is why the two rules from your first listen, a warm bed under the
drums and no effects, now hold for every variation, including the ones built since. Nobody
has to remember them; the tests fail if anything breaks them.

## What I am

| Part | What it is | What it means for the beats |
|---|---|---|
| Model | A large language model (Claude). I read and write text and can read images; I can't take audio as input here. | I work on sound through its code and its measurements, never by listening. |
| Knowledge | Learned from training: signal processing, synthesis, music theory, psychoacoustics, the research literature. | Where the "what would sound warm, what would sound like an alarm" judgements come from, before anything is measured. It is general knowledge, not your taste. |
| Working memory | This conversation, which is large but finite. Long sessions are compressed into summaries (part of this one already has been). | Anything that must last goes into files. A summary can lose a nuance; a test can't. |
| Lasting memory | Files: `plan/progress.md`, each style's `use.why`, the tests, the research notes, and a few notes about you and the project kept between sessions. | This is how a rule you set on the 15th still binds what I build on the 16th. |
| Tools | A shell; reading, writing and searching files; the Faust compiler; the offline renderer; the test runner; the app's self-test; helper agents for parallel work. | Today, two helper agents checked about forty claims about dual coding and "frequencies" against primary sources while I built the engine. |

What I don't have: ears, taste of my own, or any memory outside those files. My aesthetic
choices come from three places: your verdicts (the kept five), knowledge of the genre
(Plastikman, Basic Channel, Gas), and measurement against both.

## What I work on: cognition's architecture, as it matters to me

```
 style documents (JSON) ──► the arranger (pure, seeded) ──► parameter changes on bar lines
        │                                                            │
        ▼                                                            ▼
 the engine: one Faust program ── compiled to WebAssembly ──► the app (AudioWorklet)
        │                                                     the harness (offline render)
        ▼                                                            │
  every variation is a parameter document over this one program      ▼
                                                     metrics + tests ◄── same samples
```

- **One engine, many documents.** Every variation and study is a list of parameter values,
  a build (which elements arrive, in what order) and a change budget, over one program.
  Making a variation is writing a document; making a new kind of sound is changing the
  engine.
- **Determinism.** Every random stream is seeded; discrete changes land on bar lines;
  continuous ones ramp exactly. The same seed gives the same samples, in Node or in the app.
  The self-test checks this live on every build.
- **Why determinism is the keystone for me.** It turns "I can't hear" into "I can measure
  exactly what you will hear". It also lets me **prove that something did not change**: I
  fingerprint renders before and after a change and compare them sample by sample.

## In narrow terms: the four verbs

### Understanding (how I "listen")

1. **Render.** 30–75 seconds of a variation offline, at full texture (what you hear with
   "Skip") or through the real arranger from silence.
2. **Measure.** The harness computes:
   - loudness (the broadcast standard, EBU R128) and true peak;
   - short-term loudness steps;
   - onsets that stand out of their surroundings (deviants);
   - spectral tilt and brightness;
   - stereo correlation;
   - how hard the sharpest hits stand out of the mid band;
   - how much a band's level fluctuates at a given rate (new today);
   - each layer's place in the mix, by rendering it alone and comparing.

   And I look: a spectrogram of the render shows its structure at a glance (see "Where this
   process is weak").
3. **Compare groups, not single sounds.** A verdict splits variations into kept and
   rejected. I measure all of them and look for the features that separate the two groups.
   - In your first listen, the presence of a warm bed and the mid-band spike separated
     them cleanly.
   - Crest factor and low-end thump did not, so I stopped steering by them.
4. **Explain by reading code.** When a feature points at a layer, I read the layer's code to
   find the mechanism. Clockwork's knock in threes stood far out of the mid band because it
   was a short resonant ping with no bed around it.
5. **Translate words into features.**
   - "Punchy" became *mid-band spikes over a bare kit*.
   - "Strange offbeat effects" became *event-like ambience*: raindrop pings, the swoosh,
     crackle.

### Making (how a new sound is born)

1. **Concept.** A sentence: "one tone from the root's harmonic series, its overtones
   blooming", or "the sea at a breathing pace".
2. **Signal design.** Sources, envelopes, filters, randomness, routing. For example, for
   the Overtones bed:
   - partials at exact whole-number multiples of the root, each with its own slow random
     walk;
   - the right ear hears each partial slightly later in its cycle, for width;
   - sines read from a table, because the engine already runs dozens of oscillators on
     every sample.
3. **Code.** Faust, compiled to WebAssembly for the app and for the renderer.
4. **Calibration.** Automated rounds that set each new layer to a target place in the mix,
   relative to the layers you kept, and the whole variation to the family's loudness.
5. **The document.** A small generator script writes the style from Deep Work's own
   parameters plus the study's changes, so every study starts as Deep Work.

### Editing (changing without breaking)

- **Smallest change that satisfies the rule.** Everything else is held fixed on purpose.
- **Prove what did not move.** Today the engine gained three voices. Before trusting it, I
  rendered the ten existing variations on the old and new engines and compared every
  sample.
  - At first, most variations were no longer bit-identical. That was a surprise worth
    chasing.
  - I tracked it down: the compiler regroups sums when new voices join the mix, and that
    changes the last bit of floating-point rounding.
  - Every difference is more than 140 dB below the music, so it is rounding, not sound.
  - I report it as exactly that, rather than claiming "identical".
- **Watch the cost.** The new voices first made the engine far more expensive, too close to
  dropouts for comfort. Profiling voice by voice found the cause: slow random walks were
  recomputing an exponential on every sample. I moved tuning and timing work to once per
  audio block and shared envelopes between voices, and recovered part of the margin. The
  rest is the price of computing every voice all the time; if it ever causes dropouts, the
  next step is to compute only the voices a variation is playing.
- **Tests as guardrails.** The test suite encodes the parameter contract, the arranger's
  change budget, the harness limits and your rules. A change that breaks one is wrong,
  however good it sounds on paper.

### Augmenting (adding capability)

- **New voices** in the engine:
  - the harmonic series;
  - four-part chords whose inner parts move;
  - tuned noise;
  - before these, the sea, fused rain and high light.
- **New controls:** a held bass, a duck that breathes smoothly with the beat, air that
  pumps, flutter on the chords.
- **New instruments for listening:** today, how much a band fluctuates at the rate of
  syllables, how much a bed beats against itself, and spectrogram images I can look at.
- **New laws as tests:** each study's idea is checked, in the music itself where possible.
- **Research, verified.** Before building on a claim, I check it against primary sources,
  and correct it where the popular version is wrong (see `plan/current-state.md`).

## How your words became rules

| You said | I read it as | Made measurable as | Now enforced by |
|---|---|---|---|
| fewer options, simpler, keep this as a reference | the core experience is the sound, not the knobs | First Listen frozen, pinned by its hash | a hash test; the main screen's two dials |
| more varied and dynamic | change must be felt over a session, but never as an event | one move per section, inside a change budget; morphs | arranger tests for an hour of every variation |
| some slower, some faster, more or fewer clicks and drums | variety along musical axes, not settings | the family as a tempo line | the family's tempo test |
| each nuanced for cognition; more build-up and addition | a job and a world per variation; build without climax | jobs with reasons; builds, tides | build tests; the Read gate test |
| these five are good; the others punchy or strange | the kept five define the taste | a warm bed under the drums; no event-like ambience; mid-band spike ceiling | the bed test and the spike test |
| keep Deep Work; five more of it; be creative; dual coding and frequency, carefully | experiments on Deep Work, each built on one verified finding | each study's law, measured in the sound | the studies' tests |

## Where this process is weak

- **Proxies are not ears.** A variation can pass every gate and still sound wrong to you.
  The reworked five and today's studies have passed every gate and been heard by nobody.
- **I cannot feel an hour.** Fatigue, boredom and irritation build over time. Renders are
  seconds to minutes; your sessions are hours.
- **My taste is borrowed.** When you are silent about something, I fall back on genre
  knowledge, which is general rather than yours.
- **Summaries lose texture.** Long sessions get compressed. The defence is writing decisions
  down where code and tests can see them.
- **Metrics can be over-fitted.** Tuning to a number can make a sound worse in ways the number
  misses. The defence is comparing groups you have judged, not chasing single numbers.
- **No test of the actual benefit.** Nothing yet shows that any variation helps you focus.
  That needs your sessions, ideally blind and randomised, which the research notes describe.

A sense added today: I can read images, so I now render spectrograms (frequency against
time) and look at a sound's structure the way an engineer would. Onsets show as vertical
strokes, held tones as lines, noise as haze.
- **It caught a real problem.** The first version of Shelter's veil looked like broad haze,
  which is hiss, the thing you rejected in the first listen. Before you heard it, the veil
  was narrowed into pitched breath, and the masking moved into a soft air band whose
  brightness is held inside the range of the variations you kept.
- **Numbers caught the next one.** The measurements then showed the reshaped veil was barely
  covering the speech band at all. A bug had made its air layer far too quiet to matter.
  Each check catches what the other misses.
- **It confirmed the ideas.** Unbroken has no strokes above the kick, and Overtones'
  partials are clean lines.

It adds a sense; it does not replace yours.

## How to steer this best

- **Name the variation and the moment.** "Overtones, after about ten minutes, the seventh
  felt sour" is enough to act on. The notes hotkey (Ctrl+Alt+Shift+N) records the full
  parameter snapshot with your words, so I can see exactly what was playing.
- **Contrasts beat absolutes.** "A is warmer than B" teaches me more than "A is fine".
- **Say what to keep.** Your "keep" is the strongest constraint I have. I treat the kept
  five and Deep Work as fixed unless you say otherwise.
- **Declare checkpoints.** "Good enough to work to" and "Deep Work accepted" are yours to
  call, and they unblock the next phases.
