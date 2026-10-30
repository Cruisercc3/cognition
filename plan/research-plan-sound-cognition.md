# Research plan: sound design for cognition

*16 October 2026. A plan for the research phase on how cognition should invoke sound to
support thinking. It runs as dynamic workflows once enabled. Results land in `research/`
and feed the next round of sound work.*

## Why this research, and what it must produce

The engine already follows rules: the bed carries the drums, nothing arrives as an event,
continuous rather than segmented change, ratios rather than numbers. Several of its most
important settings are still guesses:
- how often things change;
- how slowly they fade;
- how predictable patterns are;
- what makes a new element blend in or stand out;
- what moves arousal up or down.

The research must turn into **design rules with numbers**, not a literature review. Each rule
names the sound property, the direction and size of the effect, for whom and for which
kind of work, how sure we are, and the engine parameter it sets.

## The questions, in four clusters

**1. Change and attention.** How background sound should change over hours.
- What rate and size of change keeps sound unnoticed without boredom or fatigue? This covers
  habituation, dishabituation, the vigilance decrement and mind-wandering.
- How predictable must a pattern be to fade from notice? This covers statistical learning,
  musical expectation (Huron, IDyOM), how fast people learn loops and repeated noise, and
  pattern vocabulary size.
- **Sets:** section length, the change budget, fade lengths, the tide period, how often
  patterns vary, randomness in note and hit choice.

**2. The mix as one place.** What makes the sound one background.
- **Auditory scene analysis:** which cues make an added element fuse into the background
  stream, and which make it pop out as an object that grabs attention? Onset synchrony,
  harmonicity, shared modulation, spatial position, fade-in time.
- **Comfort over hours:** sharpness, roughness, low-frequency content and listening fatigue
  at low headphone levels; crossfeed and stereo width.
- **Sets:** element fade-ins, panning, how the beds are voiced, brightness and spectral
  targets, the Sensory Guard.

**3. Arousal and rhythm.** How sound moves alertness.
- How do tempo, event density, brightness and loudness shift arousal, physiologically and in
  performance? Is there an inverted U? How does it differ for ADHD, autistic and introverted
  listeners?
- **Rhythm:** syncopation and groove against arousal, whether beat entrainment affects
  attention, and humanised timing (random against 1/f).
- **Sets:** the Character dial, tempo per job, kick and tick density, swing and humanise,
  future state changes (Settle → Deep → Energise).

**4. Work and practice.** What works for which work, and what makers know.
- Effects by task: reading, writing, programming, maths, creative ideation and combining
  ideas across domains (the user's Fuse work).
- Practitioner knowledge, read critically:
  - Eno and generative music;
  - adaptive game audio and how it avoids repetition fatigue;
  - dub-techno and ambient production practice;
  - the Endel and Brain.fm whitepapers.
- **Sets:** each job's design, the studies' next versions, new variations.

## How it runs

### Workflow 1: sweep and verify (one pipeline per cluster)

Each cluster runs as a pipeline, with no waiting between stages.

1. **Sweep.** One researcher agent per cluster searches three ways:
   - reviews and meta-analyses first;
   - then the primary studies they rest on;
   - then practitioner sources.

   It returns structured findings (format below). Target: 15–30 findings per cluster.
2. **Verify.** One skeptic agent per cluster tries to *refute* each finding:
   - Does the paper exist?
   - Does it say this?
   - Is the effect size right?
   - Has it replicated?

   Its verdicts: confirmed, corrected, or rejected. Invented or misremembered citations are
   the main risk, so nothing reaches synthesis unverified.

That is 8 agents (4 sweep, 4 verify). Under a cap of 5 per workflow, it splits into two
runs: clusters 1–2, then 3–4.

### Workflow 2: synthesis (one agent, after reading all verified findings)

- **Rules:** a table, ranked by impact on the engine, with numbers where the evidence
  allows.
- **Conflicts:** where findings disagree, and what would settle it.
- **False or unsupported popular claims**, and why.
- **Open questions** worth a personal test, phrased as Lab trials against Deep Work.

### Then me, with you

I read the report and propose concrete changes, each traced to a rule. You choose which to
build. Each change gets a test, as today.

## The format of a finding

| Field | Content |
|---|---|
| claim | one sentence |
| sources | authors, year, journal; DOI or link |
| design | lab / field / meta-analysis / practitioner; sample size |
| effect | size and direction (d, g, r, or what was measured) |
| replication | replicated / single study / contested / failed |
| grade | strong · moderate · weak · contested · false |
| population | who it applies to (general, ADHD, autistic, musicians…) |
| task | which kind of work it was shown on |
| rule | the design rule it implies, with numbers where possible |
| engine | the parameter or mechanism it sets |

## What done looks like

- `research/sound-cognition-research.md`: the verified findings, the rule table, conflicts,
  false claims and Lab trial candidates.
- `research/sound-cognition-findings.json`: the same findings, machine-readable, so later
  rounds can trace each rule to its source.
- Every rule carries a grade, and every strong or moderate rule has passed verification.

## What this research cannot answer

Whether any of it helps *you*. Studies average over people; you are one listener with your
own ear and your own work. The research narrows the options and the rules. Your sessions,
and eventually the Lab's blind trials, decide.
