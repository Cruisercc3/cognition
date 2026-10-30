# Current state: the beats

*16 October 2026, with the Field engine added on 22 October (see "Since 22 October" below).
An interpretation of where the sound stands, how it got here, and the reasoning it now rests
on. For the build log, see `progress.md`; for how the AI makes the beats, see
`how-the-ai-works.md`.*

## Since 22 October: a second engine, Field

Everything below this section describes the Pulse engine, which is unchanged. On 22 October
a second engine was added, built from the verified research
(`research/sound-cognition-research.md`) and the plan in `sound-dimensions-plan.md`.

- **Why.** Every Pulse variation sits in one corner of sound: a kick, one key, one dark
  colour, one kit, one room. The jobs differed by label more than by sound. Field opens the
  rest of the map: no pulse, or a pulse carried by tone; separate soft tones; bright colours;
  struck, plucked and glass matter; vast spaces.
- **Three worlds, seven styles,** one line that Auto walks:

  | World | Styles (job) | What it is |
  |---|---|---|
  | **Drift** | Tide (Recover) · Still (Read) · Ink (Write) | No beat. A held chord whose voices change one at a time by crossfade, a drone, high harmonics, pitched air, a large dark room. |
  | **Bloom** | Garden (Reflect) · Wander (Ideate) | Soft felt and bar tones on loops of different lengths that never line up, over the bed. |
  | **Lattice** | Build (Build) · Run (Routine) | No drums: two lines play one figure; the second slides out of phase and locks one step later. |

- **Journeys.** The colour ladder (Phrygian to Lydian, one note per rung), the phase, and
  voice-leading let a session travel far without one noticeable step.
- **Rules carried over:** every Pulse law holds for Field by test (loudness matched, no jumps,
  no deviants, nothing stands out of the bed, a tonal bed in every foundation, no voices),
  plus one law per world.
- **Status:** measured, not heard.

## In one paragraph

cognition plays a family of ten variations and, from today, five **Deep Work studies**, all
generated live by one engine. The plan set two goals:
- **Recreate the beat of Deeper Focus.** This has reached "a good base": five variations kept
  by ear, Deep Work among them.
- **Discover what helps your cognition.** This starts properly with the studies. Each changes
  Deep Work in one way that a verified finding about sound and cognition points at.

What is established by ear is five variations. What is established only by measurement is the
other ten. Nothing yet shows that any of it helps you focus; that is what sessions, and
eventually the Lab, are for.

## How the work has moved

Each step changed what the work was *about*, not only how it sounded.

1. **A believable base** (First Listen). The engine could make a Deeper-Focus pulse. Your
   ruling: a good base; Endel is much higher quality; keep this one as the reference. It is
   frozen and playable for A/B.
2. **Quality, then variety** (1a.2–1a.3). The quality gap was measured rather than guessed: a
   hollow middle, a mono image, a clamped kick. The engine was rebuilt around those three
   faults. One sound became a family, then ten, laid out as a line from slowest to fastest.
3. **Meaning by assignment** (1a.4). Each variation was given a cognitive job, a world and a
   build-up. "For cognition" entered the design here, but as labels attached to sounds.
4. **The first verdict** (1a.5). You kept Low Light, Dub Chamber, Deep Work, Acid Drift and
   Machine Room, and rejected the rest as punchy or strange. That verdict taught more than any
   document had. It produced two rules nobody had written down:
   - the bed carries the drums;
   - nothing arrives as an event.

   Once seen, both matched the research. They now hold for everything by test.
5. **Meaning by derivation** (1a.6, today). The studies reverse step 3. Each starts from a
   finding about how sound meets the mind, derives a sound from it, and holds the sound to the
   finding with a test.

So the direction of travel is: **imitate, then assign, then derive.** What has stayed constant:
- your ear decides;
- the research narrows the options;
- the tests remember what was decided.

## Where the beats stand

### The family (ten): a line from slowest to fastest, which Auto walks

| | Variations | Status |
|---|---|---|
| **Kept by ear** | Low Light · Dub Chamber · Deep Work · Acid Drift · Machine Room | Your taste, in sound. Treated as fixed unless you say otherwise. |
| **Rebuilt, not yet judged** | Shoreline · Rainfall · Quiet Room · Daylight · Night Road | Built to the two rules and measured against the kept five. The logs show a brief audition of Shoreline and Rainfall on the evening of the 15th, but no verdict yet. |

### The studies (five): experiments on Deep Work, outside Auto

| Study | Job | Built on | In the sound |
|---|---|---|---|
| **Unbroken** | Write | Verbal memory is disrupted by sound in separate, changing pieces, not by continuous sound | No ticks or notes. A held bass and pad breathe with a soft kick; air swells where the ticks were. |
| **Middle Distance** | Design | Visual thinking runs on a different code from words | A four-part chord whose inner parts dissolve to new notes. The top never moves. No scenes. |
| **Overtones** | Hours | Ratios between pitches matter; absolute pitch doesn't | One tone from the root's harmonic series, overtones blooming. The kick is tuned to the root; nothing beats. |
| **Flutter** | Hold | The brain follows a sound's envelope | The pad and chords flutter at eight pulses a beat (16 Hz), arriving gradually. |
| **Shelter** | Shield | Speech you can follow is the worst distractor | A steady veil of tuned breath over the band where speech is understood. |

### The engine

- **One program; every variation and study is a document over it.**
- **Three new voices for the studies:**
  - the harmonic series;
  - four parts that change by crossfade;
  - tuned noise.
- **Four new controls:** a held bass, a duck that breathes smoothly with the beat instead of
  snapping, air that pumps with it, and the beta flutter carried onto the chords.
- **The existing ten are unchanged in sound.** Rendered on the old and new engines, they
  differ only in floating-point rounding, far below anything audible.
- **The cost rose.** In rendering tests the engine now needs nearly two thirds of a CPU core,
  up from under half, because every voice is computed whether or not it is playing. It ran
  cleanly in the live self-test, but it is the main technical risk. If the app ever drops
  out, the fix is to stop computing voices a variation isn't using.

### The rules in force

These hold for every variation. The first five are held by tests; the sixth holds by
construction, because the engine has no voice to speak with.

1. **A warm tonal bed carries the drums.** *(your ear)*
2. **Nothing arrives as an event.** Ambience is a continuous texture or a musical tone.
   *(your ear; the research on sudden sounds)*
3. **Every change is a slow fade, inside a change budget.** *(research on deviants and
   loudness jumps)*
4. **Nothing hits harder than the kept five.** No knock, clap or tom stands out of the mid
   band. *(your ear)*
5. **The Read gate.** In Read, every repeated sound is the same token, and nothing is
   melodic. *(research on changing sound)*
6. **No voices, ever**, and nothing speech-like. *(the strongest finding there is; see
   below)*

Each study adds one law of its own, also held by test.

## The framework: dual coding and "frequency", with the false parts removed

You asked for dual coding theory and frequency as the frame, used with care because much of
what circulates is wrong. Every claim below was checked against primary sources this week.

### What dual coding theory says, and what it doesn't

- **It says** the mind has two linked systems:
  - **Verbal:** language in any form, heard, read or spoken.
  - **Nonverbal:** images, and sounds that aren't language. Music belongs here by
    extension; it isn't one of the theory's own examples.

  Words and images connect by naming and imagining. Verbal processing runs in sequence;
  imagery holds things at once.
- **It doesn't say** that people are "visual" or "auditory" learners. Matching teaching to a
  learning style has no support.
- **It doesn't mean** "eyes plus ears". That is a different model, about senses rather than
  codes.
- **It doesn't predict** which background sounds interfere with work. Other research does
  that, below.

### What the evidence on background sound shows (the parts that hold up)

1. **Meaning is the worst distractor.**
   - Speech you can follow, and lyrics, hurt reading and writing most.
   - Instrumental music and steady noise come out near zero for reading.
   - Speech made unintelligible, while still sounding like speech, did not hurt writing.
2. **Separate, changing pieces disrupt verbal order memory.**
   - Sound made of distinct, changing tokens (a melody, varied hits, speech) disrupts holding
     a sequence in mind. Repeated identical tokens and continuous sound barely do.
   - A continuous pitch glide did not disrupt; the same glide broken by gaps did. Legato music
     did not; staccato did.
   - Volume hardly matters.
   - A psychoacoustic measure, fluctuation strength (highest around four fluctuations a
     second), predicts the size of the effect across many kinds of sound.
3. **That effect is verbal.** The same disruption of spatial memory was reported once and
   failed to replicate.
4. **Surprise disrupts everything.** An unexpected sound costs any kind of work. Concentrating
   harder protects against surprise, but not against changing pieces.
5. **The two codes really are separate.** This is dual coding's cleanest support where sound
   is concerned: irrelevant speech disrupts rote verbal rehearsal but not imagery, and moving
   visual noise does the reverse.
6. **Steady sound fades from notice.** People habituate even to background speech within
   about twenty minutes; any change brings it back.
7. **People differ.**
   - Noise helps people with attention difficulties a little, and costs others a little (in
     studies of young people).
   - Liking a piece of music does not protect you from it.
   - A bigger working memory protects against surprise, not against changing pieces.

### "Frequency" is five different things

Most false claims come from treating these as one.

1. **Absolute pitch (432 Hz, 528 Hz).**
   - **True:** A = 440 Hz is a convention, and 432 Hz is a third of a semitone lower.
   - **False:** that either has any special effect. Nothing in the body resonates at either
     frequency, and no credible study shows a benefit.
2. **Ratios between pitches.**
   - **True:** consonance follows harmonicity: tones whose components are whole-number
     multiples of one fundamental, which the ear fuses into one.
   - Equal-tempered chords beat. A major third near middle C beats about ten times a second,
     and faster beating becomes roughness, the acoustic signature of alarms and screams.
3. **Modulation rate (how fast loudness moves).**
   - **True:** this is the frequency the brain actually follows. Speech's loudness moves about
     five times a second and music's about twice; brain rhythms track the beat.
   - **False:** that a brainwave band is a dial. "Alpha for calm, gamma for insight" has no
     replicated support.
   - Binaural beats mostly fail to entrain the brain, and failed a direct test of sustained
     attention.
   - 40 Hz is contested even in mice, and missed its main endpoint in a human trial.
   - A 16 Hz flutter locked to the beat has one positive study, company-run, and only in
     listeners with more ADHD symptoms.
4. **Band (where in the spectrum).**
   - **True:** hearing is most sensitive around 2–5 kHz, where harshness and annoyance live.
   - Speech is understood mostly from its 1–4 kHz content, though its energy peaks near
     500 Hz.
5. **Register (which part is highest or lowest).**
   - **True:** pitch changes in the top line are the ones the ear notices most.
   - Timing is heard best in the lowest line.

### The inferences: kept, and rejected

**Kept.** Each is now a law in the engine or a study:

| Inference | Strength | Where it lives |
|---|---|---|
| No voices or speech-like sounds | strong | every variation |
| For verbal work, change should be continuous, not segmented | strong in the lab (verbal order memory); smaller for reading, where meaning dominates | **Unbroken** |
| Nothing arrives as an event | strong | every variation |
| For visual work, slow movement inside the harmony is allowed; pictures kept out as a precaution | the code split is solid; whether imagery-rich sound competes with visual thinking is untested | **Middle Distance** |
| Tune by ratio, not by number | consonance and roughness are solid; easing long sessions is our inference | **Overtones** |
| If you modulate, modulate the envelope: beat-locked, below roughness, introduced gradually | weak: one study | **Flutter** |
| When voices are near, cover the band speech is understood in, steadily | strong for masking; noise costs people who don't need it, so use it only then | **Shelter** |

**Rejected.** These are popular, but false or unsupported:

- **"Instrumental music can't interfere with verbal work, because it isn't verbal."** False:
  changing tones disrupt verbal order memory.
- **"Dual coding means visual and auditory learners."** False.
- **"Sound can't affect visual work, because the codes are separate."** Partly false: surprise
  disrupts every kind of work.
- **"Particular frequencies (432, 528, 40 Hz, alpha) put the brain in particular states."**
  Unsupported.
- **"Binaural beats entrain the brain."** Mostly not, and they are weaker than plain
  modulation.
- **"Noise helps everyone focus."** No. It helps some people a little and costs others a
  little.
- **"Music you like can't distract you."** False.

## The five studies as experiments

Each study is a claim you can test against Deep Work by working with it.

**Unbroken (Write)**
- **What changed from Deep Work:** every segmented layer except the kick removed. The bass is
  held, the bed breathes with the beat, and air swells between the beats.
- **Evidence:** strong for verbal order memory; small for reading.
- **Listen for:** writing or coding feeling less interrupted; whether the groove still carries
  you without ticks.
- **Counts against it:** no difference from Deep Work on writing days, or the missing ticks
  feeling like a missing floor.

**Middle Distance (Design)**
- **What changed from Deep Work:** the pad replaced by four parts whose middle moves; no scene
  sounds.
- **Evidence:** the code split is solid; the rest is an untested precaution.
- **Listen for:** diagrams and systems work feeling unhurried; whether the moving middle
  stays below notice.
- **Counts against it:** you notice the chord changes while you work.

**Overtones (Hours)**
- **What changed from Deep Work:** the pad replaced by one harmonic-series tone; the kick
  tuned to the root; no tempered chords.
- **Evidence:** solid on consonance; untested on fatigue.
- **Listen for:** the third hour feeling like the first; whether one tone is enough harmony.
- **Counts against it:** thin or bland after a while, or no less tiring than Deep Work.

**Flutter (Hold)**
- **What changed from Deep Work:** the beta flutter on the pad and chords, as an element that
  arrives and recedes.
- **Evidence:** weak, and limited to listeners with more ADHD symptoms. If that describes you,
  this is the study most worth testing properly.
- **Listen for:** fewer drifts on scattered days.
- **Counts against it:** the flutter is noticeable or tiring, or makes no difference.

**Shelter (Shield)**
- **What changed from Deep Work:** a tuned-noise veil as the first element, under Deep Work's
  beat.
- **Evidence:** strong for masking; slightly costly in quiet.
- **Listen for:** voices around you blurring; whether the veil reads as breath rather than
  hiss.
- **Counts against it:** it sounds like hiss (which you disliked before), or voices still
  cut through at a comfortable volume.

## How sure we are

**Does each study do, in its sound, what its idea says?** Measured on renders, against Deep
Work:

- **Unbroken.** Its speech band flutters at the rate of syllables about a sixth as much as
  Deep Work's. That is as little as the calmest ambient variations, while still keeping a
  kick.
- **Middle Distance.** The same measure comes out at about a third of Deep Work's: the
  harmony moves, but as legato.
- **Overtones.** Its bed, heard alone, beats about a quarter as much as Deep Work's detuned
  pad.
- **Flutter.** Its pad, heard alone, carries a strong 16 Hz flutter that Deep Work's pad
  lacks. In the full mix, Deep Work's sixteenth notes already put some energy at 16 Hz;
  the flutter adds a steady, beat-locked layer of it.
- **Shelter.** The band speech is understood in is never empty: its quietest moments sit
  about 20 dB above Deep Work's, whose energy there comes only in bursts. It stays no brighter
  than the variations you kept.

Then the levels of knowing:

- **Heard and kept:** the five family variations you chose.
- **Measured, not heard:** the five rebuilt variations and all five studies. Each passes every
  gate:
  - loudness matched;
  - no clipping, loudness jumps or stand-out hits;
  - real stereo above the bass;
  - its own law.
- **Unknown:**
  - whether any variation helps you focus;
  - how the studies feel over hours;
  - whether the engine keeps its margin in long live sessions.

## What would move it forward

1. **A listening round** through the rebuilt five and the studies. A short note per variation
   is enough; the notes hotkey records exactly what was playing.
2. **Your checkpoints.** "Good enough to work to" unblocks the Lab and the states phases.
   "Deep Work accepted" is the other.
3. **A real test of a study.** The plan's Lab exists for exactly this: arms pinned to a
   style's content hash, randomised blocks, a passive outcome (minutes to your first
   self-chosen break). Flutter against Deep Work is already the Lab's third trial; each study
   is a ready-made arm against Deep Work.
4. **A long live session**, to confirm the engine never drops out at its new cost.

The next phases (Hardening, the Lab, States) remain yours to start.
