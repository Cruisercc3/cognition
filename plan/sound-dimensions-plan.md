# Sound dimensions: the plan

*22 October 2026. From the research in `research/sound-cognition-research.md` to the engine.
Sound first: everything here is about what you hear. Planned and built in one stage at your
request; what is built and what is next is marked at the end.*

## What the research and your listening say together

**Your listening.** Since the studies arrived you have played almost nothing but Deep Work,
including one session of about fifteen hours. The studies and the reworked five were tried
for seconds. So the kept sound works, and the variety around it has not pulled you anywhere.

**The diagnosis.** Every variation and every study sits in one corner of sound:
- a kick-carried pulse, between 98 and 128 bpm;
- one key (F), one dark minor colour;
- one instrument kit: analog synth, 808 metal, noise;
- one kind of space: a room and a dub delay.

The jobs differ by label more than by sound. Moving between them is a small step inside that
corner, which is why none of them is a different place to be.

**What the research adds.**
1. **No one gets used to it** (rule 1), and **exact repetition is learned fast and kept for
   weeks** (rule 7). Over a fifteen-hour day, the same narrow vocabulary is learned and then
   simply carried. The answer is not more change per minute, which costs attention. It is
   **larger change over longer spans, each step below notice** (rules 6, 22).
2. **Slow, expected change costs little; surprise costs a lot** (rule 6). So a large
   journey is safe if every step is the smallest possible step, on a schedule the ear can
   learn.
3. **Different work tolerates different sound** (rules 2, 4, 32, 37). Verbal work wants
   continuous sound without separate changing pieces. Spatial and building work does not
   suffer from changing pieces. Idea generation is the one place where livelier, brighter
   sound has any positive evidence, and it is weak. Insight on one hard problem prefers
   quiet. So cognitive styles should differ in the large dimensions of sound, not in
   details.

## The dimension map

Six large dimensions of sound. Each cognitive style is a position on all six; each world
opens a region of the map.

| Dimension | From | To | Where the current sound sits |
|---|---|---|---|
| **Pulse** | none: time felt as breath | carried by tone (interlocking notes) · carried by drums | drums only |
| **Grain** | continuous: nothing starts or stops | pointillist: separate soft tones | mid: ticks over a bed |
| **Harmony** | still: one chord for minutes | cycling (a slow progression) · wandering (open-ended) | still |
| **Colour** | dark modes (Phrygian, Aeolian) | bright modes (Mixolydian, Ionian, Lydian) | dark minor only |
| **Matter** | synthetic (oscillators, noise) | struck and plucked tones · glass and bowed tones | synthetic only |
| **Distance** | close and dry | vast | a room |

## Two engines, five worlds

The Pulse engine is the current one, unchanged. The kept five, Deep Work and the studies stay
exactly as you heard them.

The new **Field** engine holds the beatless and tonal worlds. It is a second program, so it
costs nothing while Pulse plays, and Pulse's cost does not grow.

| World | Engine | Pulse · grain · matter · distance | Sound |
|---|---|---|---|
| **Pulse** | Pulse | drums · mid · synthetic · room | The minimal-techno family: Deep Work and its relatives. |
| **Drift** | Field | none · continuous · bowed and glass · vast | No beat. A warm chord bed whose voices change one at a time by crossfade, a root drone, high harmonics swelling on their own clocks, a large dark space. |
| **Bloom** | Field | none · pointillist · struck · vast | Soft mallet and felt tones on several loops of different lengths, so their combination never repeats, over the bed. After Eno's *Music for Airports*. |
| **Lattice** | Field | tone · pointillist and cycling · plucked and struck · room | Two lines play one short figure. One slowly slides out of step with the other and locks one step later, as in Reich's phase pieces. Over a held chord. No drums. |

Drift, Bloom and Lattice share one engine, so Auto can move between them as a slow blend: a
large dimensional shift made of small steps.

## Cognitive styles in sound

| Style | Job | World | Position | Why (research rule) |
|---|---|---|---|---|
| **Still** | Read | Drift | no pulse, continuous, one chord, dark, nothing melodic | Spectral change between pieces is the verbal cost; a stationary bed costs nothing measurable; the realistic best for reading is "no harm" (2, 3, 4) |
| **Ink** | Write | Drift | no pulse, continuous, inner voices move slowly, warm | Continuous change instead of separate pieces (2); legato, not staccato |
| **Tide** | Recover | Drift | no pulse, the whole bed breathing slowly, vast, dark colours | Tempo and pulse set arousal; a beatless stretch lowers it (29) |
| **Garden** | Reflect | Bloom | sparse tones, long decays, Dorian | Low prediction error: few, consonant, slowly varied (6, 16) |
| **Wander** | Ideate | Bloom | denser tones, brighter modes, wider range | Happy, energetic sound raised divergent scores (weak); not for insight (37) |
| **Build** | Build | Lattice | tone-carried pulse in eighths, phasing, cycling chords | Spatial work is not disrupted by changing pieces; regular patterns do not capture (21) |
| **Run** | Routine | Lattice | faster, brighter, denser | Tempo is the arousal lever (29); fast-and-loud is kept away from reading (42) |

## Journeys: large shifts, smallest steps

Three mechanisms make a session travel a long way without one noticeable step.

1. **The colour ladder.** The modes on one root, ordered dark to bright (Phrygian, Aeolian,
   Dorian, Mixolydian, Ionian, Lydian), differ from their neighbours by exactly one note. A
   journey moves one rung at a time, and only the voices on that note crossfade. Over an hour
   the colour can travel from dusk to daylight; no single step changes more than one note.
2. **Phasing.** Lattice's second line slides one step out of phase over about a minute, then
   locks. Each lock gives a new interlocking figure built from the same notes. The process is
   lawful and audible as texture, never as an event.
3. **Voice-leading.** The bed's voices change one at a time, by slow crossfade (never a glide
   through the notes between), so the harmony moves without a chord change ever arriving.

These are a new arranger move, **shift**: step a dimension one rung along its ladder. It
draws on the same change budget as every other move, so there is still at most one change
per section.

## The engine change that makes room for this

- **Silent voices cost as much as playing ones** in a single program; Faust's on-demand
  computation is not available in the WebAssembly back end (tested today). In the Pulse
  engine, the ambience and study beds are silent most of the time but take about half its
  CPU. A new world added to that program would have pushed it past a safe margin.
- So worlds live in **engines**: one program per engine, and a session runs only the one it
  plays. The app already switches programs (that is how First Listen plays), with a short
  fade between them.
- Shared blocks (clock, latch, seeded noise, loudness guard, limiter) come from the same
  library, so every engine obeys the same contract and the same Sensory Guard.

## The laws carried over, and the new ones

Carried over, held by the same tests for every new style: no clipping; no loudness jump; no
deviant onset; the output floor; loudness matched to the family; real stereo; nothing stands
out of the mid band harder than the kept five; a warm tonal bed in every foundation; no
voices.

New, one per world, held by test in the sound itself:
- **Drift.** Nothing starts or stops: no onsets beyond the steady texture. In Still, the
  speech band fluctuates at the rate of syllables less than Unbroken's does.
- **Bloom.** The loops never line up: their periods are pairwise incommensurate, and every
  tone comes from the mode.
- **Lattice.** The two lines are the same figure, one behind the other, and their offset only
  ever moves by sliding, never by a jump.
- **The colour ladder.** Every shift changes exactly one note.

## Built now, and next

**Built in this stage:**
- the Field engine (Drift, Bloom, Lattice voices, a large space, the shared master chain);
- the seven styles above, with a Field line for Auto;
- the shift move and the colour ladder;
- tests for every law above;
- on the main screen, a Field section with its own Auto.

**Next, if you want it:**
- **Journeys for Pulse:** the tide carries the key. A key or colour step happens at the bottom of a
  tide, when the fewest elements play. It needs a crossfaded root in the Pulse engine, so
  it waits for your word, because it touches the kept sound.
- **A fourth world, Motor:** a motorik eighth-note pulse, bright and major, for energy.
- **Pulse's cost:** split its idle ambience and study beds into an engine of their own.
