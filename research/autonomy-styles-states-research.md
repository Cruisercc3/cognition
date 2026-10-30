# Autonomy, styles and cognitive states — research addendum

*Compiled 2026-10-13. This addendum builds on the earlier focus-audio research. It brings together three research strands (autonomy, styles and control panel, cognitive states beyond focus), each checked by an adversarial verifier. Where a verifier found a claim wrong, the claim has been corrected or removed. Claims the verifier only weakened, or could not check, are flagged.*

**How to read the labels**
- **Kind of claim:** `fact` (documented spec or behaviour), `marketing` (a vendor's own claim), `research` (peer-reviewed or preprint evidence), `inference` (our design reasoning).
- **Confidence:** H (high), M (medium) or L (low).
- **Verification status:** **[V]** confirmed by the verifier. **[W]** weakened, with the correction applied. **[U]** could not be verified. **[C]** the original claim was wrong and is corrected here.
- **Sources:** every claim carries a URL. The full list is grouped under Sources at the end.

---

## Bottom line

1. The evidence supports an engine that acts on its own **over the length of a session and across sessions**, not one that reacts second by second to your body. No study found shows that sound adapting to behaviour beats a well-designed fixed session shape. "Autonomy on vs off" should therefore ship as a built-in self-experiment rather than be assumed to help `[inference, M]`.
2. **Autonomy and focus pull against each other.** Research on irrelevant sound finds that changes in the sound, not steady sound, are what disrupt verbal and serial-order work (Jones, Madden & Miles 1992; Jones & Macken 1993) `[research, M-H, V]`. For the proposed focus default, "autonomous" should mean slow, bounded, smoothly glided drift with a low **change budget** (a cap on how much the sound may change). Lively movement belongs in the Creative and Explore styles.
3. **The obvious noise-bed default may backfire.** White or pink noise helps people with ADHD or attention problems a little (g = +0.25) and slightly *hurts* people without them (g = −0.21) (Nigg 2024) `[research, H, V]`. The focus style therefore needs per-user calibration, with quiet or silence as one of the arms the engine tests.
4. **Outside focus, these levers have the best support:**
   - nature sound for stress recovery (g = −0.60 for stress and annoyance);
   - slow paced breathing at about 4.5–6.5 breaths/min, which works only if you actively follow it;
   - 25–60 minutes of music before sleep, which improves *self-rated* sleep only;
   - a hard gate that keeps intelligible speech out during reading and writing.

   The creative claims are fragile. Creativity from moderate noise (Mehta 2012) has no adult replication. The incubation-by-mind-wandering result (Baird 2012) failed to replicate (Murray 2024; McDaniel 2025 cites it as non-replicating).
5. **Signals:** a one-tap self-report gets the most weight. Mouse and keyboard signals are weak and differ from person to person. A browser-only build can only detect idleness of 60 seconds or longer. A thin Electron or Tauri desktop shell is what makes autonomy workable on Windows 11: second-level idle detection, screen lock, which app is in front, and no throttling of background timers.
6. **Styles:** a style should be a declarative JSON document. Macros map to parameters (as in Ableton). Bounded drift bands work like myNoise's Animate feature. Lineage records where a style came from. The control panel has four tiers: session controls, 4–6 macros, workshop pages, and a raw editor. Styles are created by morphing, mutating (as in Synplant) and merging. On Windows, AI is useful only for generating textures offline. Magenta RealTime 2 runs in real time only on Apple Silicon, and RAVE's licence forbids commercial use.
7. The "other cognitive understandings" you hope will emerge are only discoverable honestly through **blinded, randomised n-of-1 trials** with objective probes. Your in-the-moment sense that something helps is confounded by arousal, mood and expectation.
8. **Naming:** "Deeper Focus" is the name of one of Endel's modes. Ship the default under a name of your own (see Open questions).

---

## Session arc and flow dynamics (what is solid vs pop-science)

### Solid enough to design on

| Finding | Kind / conf. | Status | What it means for the build |
|---|---|---|---|
| In a 3-day shadowing of 36 knowledge workers, interrupted work was resumed after an average of **23 min 15 s**, with about 2 other tasks in between; 81.9% was resumed the same day (Mark, Gallup interview). The peer-reviewed CHI 2005 paper reports **25:26 (n = 24, SD ≈ 54 min)**. Both measure *time until the task is resumed*, **not** time until concentration returns. [Gallup](https://news.gallup.com/businessjournal/23146/too-many-interruptions-work.aspx), [Silicon Canals summary of CHI 2005](https://siliconcanals.com/t-work-interruptions-23-minutes-275-pings-organisational-focus/) | research, H | V (C: re-entry framing) | The variance is huge, so a fixed "re-entry window" is not evidence-based. Make it a learned parameter that the user can edit. |
| **Attention residue:** thinking about the previous task lowers performance on the next one. Finishing the first task under a *tight deadline* reduced the residue (Leroy 2009, OBHDP 109(2)). [strategy+business](https://www.strategy-business.com/article/re00088) | research, M | V | The rate of app switching is a meaningful drift signal. A "closure cue" is an experiment only; there is no evidence that sound reduces residue. |
| Flow at work changes **abruptly and nonlinearly**. A cusp catastrophe model fit 6,981 experience-sampling observations from 60 employees better than linear or logistic models, and challenge drove the abrupt shifts (Ceja & Navarro 2012, *Human Relations* 65(9):1101-1127). [UB repository](https://diposit.ub.edu/items/33ae6dc9-04cd-4f54-b671-7c6c6eefbd3e/full) | research, M | V (the 2011 "75% chaotic" sub-claim is [U]; the cited page reports 80% chaotic dynamics in a 2008 *JHS* paper: [uv.es](https://www.uv.es/docpot/publi_recientes_ceja.htm)) | Use a state machine with hysteresis (it must cross a higher bar to leave a state than to enter it), not continuous tracking that would chase noise. |
| The vigilance decrement (attention falling off on a monitoring task) shows up **early**. Speed and sensitivity declined from the first ~2-minute blocks (Rann & Almor 2025). Whether this reflects brief lapses or lost sensitivity is still debated (Gartenberg 2018). [PMC12504179](https://pmc.ncbi.nlm.nih.gov/articles/PMC12504179/), [Frontiers 2018](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.01504/full) | research, M | W (C: the "within 5 min" and "42-study meta-analysis" claims are unsupported and dropped) | Small variations in the texture should start within minutes. Keep them slow and low in salience (see the change budget). |
| **Brief goal reactivations:** Ariga & Lleras 2011 prevented the decrement, but Helton & Russell 2012 (n = 498) found Bayesian evidence *for no effect*. The second study used content-free cues, so it was not an exact replication. [Illinois](https://experts.illinois.edu/en/publications/brief-and-rare-mental-breaks-keep-you-focused-deactivation-and-re/), [Springer Medicine](https://www.springermedicine.com/brief-mental-breaks-and-content-free-cues-may-not-keep-you-focus/25692108) | research, M | V | Offer a "goal-refresh chime" as an experiment toggle, never as a claimed benefit. |
| **Micro-breaks of 10 minutes or less** improve vigour (d = .36) and reduce fatigue (d = .35). Their effect on performance is d = .16 and not significant overall; it was significant for **clerical and creative** tasks but not for cognitive ones. Longer breaks gave bigger performance gains (Albulescu 2022, 22 samples, N = 2,335). [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272460) | research, H | V | Present breaks as being about energy, not productivity. Offer short (3–5 min) and long (15+ min) presets. Breaks matter more in Creative styles. |
| **Scheduled breaks** (24/6 or 12/3 minutes) led to less fatigue and distraction, better concentration and higher motivation than self-regulated breaks, with no difference in effort or task completion (Biwer 2023, n = 87). A follow-up (Smits et al., MDPI, probably 2026) reportedly found Pomodoro raised fatigue faster early in the session. [Maastricht CRIS](https://cris.maastrichtuniversity.nl/en/publications/understanding-effort-regulation-comparing-pomodoro-breaks-and-sel), [PubMed](https://pubmed.ncbi.nlm.nih.gov/36859717/), [MDPI](https://www.mdpi.com/2076-328X/16/7/1158) | research, M | V / Smits [U] | The engine should *propose* breaks on a schedule by default and learn the cadence per user, rather than only waiting for you to stop. |
| **Novelty and order matter.** In Brain.fm-authored work (Woods 2024), music with amplitude modulation helped sustained attention only when it came *first* in the session (Experiment 1). The modulation-rate benefit (n = 82, p = .048) was concentrated in listeners with high ADHD symptoms. Modulation depth showed no effect (n = 93). [PMC11499863](https://pmc.ncbi.nlm.nih.gov/articles/PMC11499863/) | research, M | W (C: the original attributed the order effect to the wrong experiment and gave the wrong n) | Supports slow anti-habituation variation. 16 Hz amplitude modulation should be a user-controlled, per-user-tested parameter; most users without ADHD may see no benefit. |

### Pop-science: do not hard-code

| Claim | Status | Correct version |
|---|---|---|
| "It takes **15 minutes** to get into flow" | W/C | Its lineage is anecdotal. Joel Spolsky (2000) credits *Peopleware*: "an average of 15 minutes to start working at maximum productivity." [Joel on Software](https://www.joelonsoftware.com/2000/08/09/the-joel-test-12-steps-to-better-code/). Kotler's book repeats "studies have shown… fifteen minutes to get back into flow" without naming a study. [Goodreads note](https://www.goodreads.com/notes/20528604-the-rise-of-superman/20540607-troy-erstling/bfa78b88-d963-4e5d-8fcc-9058b98ec77f). The attribution to Slavet's Forbes column is dropped. **No primary measurement of how long it takes to enter flow was found.** `marketing, M` |
| Kotler's **struggle → release → flow → recovery** cycle | V (negative) | Not traceable to primary evidence. The Flow Research Collective page returns 404, and Wikipedia does not mention the cycle. The suggested link to Benson's "breakout principle" is [U]. Use it as a UX metaphor at most. [Wikipedia: Flow](https://en.wikipedia.org/wiki/Flow_(psychology)) `marketing, L` |
| A **90-minute waking ultradian** (rest–activity) cycle | V/C | The "meta-analysis" Wikipedia cites is Lavie's 1992 *book chapter*. Kripke et al. 1977 was titled "There's no basic rest-activity cycle". The only positive data are Hayashi 1994: n = 10, 9 hours of testing, about 4–6 cycles observed. [Wikipedia: BRAC](https://en.wikipedia.org/wiki/Basic_rest%E2%80%93activity_cycle), [BISp](https://www.bisp-surf.de/Record/PU199501075076). Use 90 minutes only as a soft, editable ceiling. `research, M` |
| "Higher HRV = more focus" | V | The direction is inconsistent. Peifer 2014 (n = 22 men) found an inverted U with sympathetic arousal and a linear positive relation with vagal indices. Chin & Kales 2019 (n = 48) found an inverted U for HF, LF and LF/HF. Scheepers & Keller 2022 (*Int J Psychophysiol* 182; this is **not** a dissertation, as the strand said) conclude "flow lowers HRV" while citing Mansfield 2012, which found no relation. [Lübeck](https://research.uni-luebeck.de/en/publications/the-relation-of-flow-experience-and-physiological-arousal-under-s/), [Frontiers 2019](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.01716/full), [Leiden](https://scholarlypublications.universiteitleiden.nl/access/item%3A3513837/view) `research, M` |
| The flow preconditions (clear goals, immediate feedback, challenge matched to skill) and the eight-channel model | V, but the source is tertiary | The only source is Wikipedia, which in 2026 carried a warning banner for possibly LLM-generated text. Cite Csikszentmihalyi or Massimini et al. 1987 directly before relying on it. [Wikipedia](https://en.wikipedia.org/wiki/Flow_(psychology)) `research, M`. **Implication:** sound cannot set how challenging a task is. Its realistic jobs are reducing distraction and regulating arousal. |

### Arc template that follows from this (all numbers are editable heuristics, `inference, M`)

`Ramp-in (5–10 min, learned) → Hold (soft cap ≈ 90 min, learned) → Break proposal (scheduled default; short 3–5 / long 15+) → Wind-down (3–5 min)`

The **Re-entry** phase fires on more than 2 minutes idle or a screen lock. It resumes near the previous state instead of restarting the ramp. Its length (default about 20 min) is learned, because Mark's resume-time data have an SD of about 54 minutes.

---

## Autonomy design

### Signals

| Signal | How captured | What it indicates | Evidence | Privacy cost |
|---|---|---|---|---|
| **One-tap self-report** ("in flow / drifting / too much / too little") | A global hotkey or a peripheral button. Sparse, at random times (the experience-sampling precedent is about 8 prompts per day). **Never a toast during deep work.** | The ground-truth label for every model | Experience sampling is the standard flow measure ([Wikipedia](https://en.wikipedia.org/wiki/Flow_(psychology)), tertiary) `research, M` | Low (stored locally) |
| Time of day, day type, elapsed session time | Clock, plus optional sunrise and sunset times | Circadian prior; where you are in the session arc | Brain.fm adapts on time of day and usage history only ([blog](https://www.brain.fm/blog/adaptive-focus-music-technology-brain-fm)) `marketing, H`. Chronotype synchrony research not retrieved [U] | None |
| System idle and screen lock (resolution in seconds) | Electron `powerMonitor.getSystemIdleTime()` and `getSystemIdleState()` (active / idle / locked / unknown); `lock-screen` and `unlock-screen` events on Windows | Away, interruption, re-entry | [Electron docs](https://www.electronjs.org/docs/latest/api/power-monitor) `fact, H` [V] | Low |
| Browser-only idle | Chrome / Edge 114+ `IdleDetector`: **60 s minimum**, permission requested after a user gesture, top-level secure context only; Firefox and Safari not supported | Coarse away or locked state only | [Chrome dev](https://developer.chrome.com/articles/idle-detection) `fact, H` [V] | Low |
| Keyboard and mouse **counts per minute** (never content) | Desktop shell hook, z-scored against a rolling 14-day personal baseline | Weak engagement or stress proxy | Weak in the field. Kowatsch 2017 (62 workers) found no mouse-speed–arousal link (p = .60) ([UniSG](https://alexandria.unisg.ch/bitstreams/237cf397-9595-46b7-9cd7-733b94de3682/download)). The ETH lab study (n = 90) found typing and mouse *beat* heart rate ([report](https://journalnews.com.ph/detecting-stress-in-the-office-from-how-people-type-and-click/)). The medRxiv generic ρ = 0.078 vs personalised ρ = 0.188 is **[U]** (403) ([medRxiv](https://www.medrxiv.org/content/10.1101/2025.08.02.25332538)) `research, M` | Medium. Aggregate only; never keystroke content |
| App-switch rate and foreground app *category* | Win32 `GetForegroundWindow` through a native helper. Store only a user-labelled category or a hashed process name, plus switches per minute | Drift, attention residue risk, task tag (reading or writing triggers the speech gate) | [MS Learn](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getforegroundwindow) `fact, H`; Leroy 2009 `research, M` | Medium to high. Opt-in, category-level only |
| Microphone RMS (dBFS only, never recorded) | getUserMedia → AnalyserNode | Room loudness, so total level can be targeted instead of piling sound on top of a noisy room | Mehta's 70 dB figure is *ambient room level* ([OUP](https://academic.oup.com/jcr/article-abstract/39/4/784/1798283)) `inference, M` | Medium. Needs a visible indicator that the mic is in use |
| BLE chest strap heart rate and RR intervals | Web Bluetooth: service 0x180D, characteristic 0x2A37 (notify). RR is present when flag bit 4 is set, in units of 1/1024 s. Needs a secure context and a user gesture. RMSSD over 60–120 s windows. **Reject straps that synthesise RR as 60000/HR** (values within 1 ms) | Arousal relative to your own baseline. Calm or recovery success = HR falling toward baseline | [Adafruit source](https://github.com/adafruit/Adafruit_CircuitPython_BLE_Heart_Rate/blob/master/adafruit_ble_heart_rate.py), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API), [Rutenberg 2026](https://www.guyrutenberg.com/2026/04/04/web-hr-monitor-heart-rate-and-hrv-in-the-browser/) `fact, H`. "No flag needed on Windows" is [U]. Polar H7 testing was informal | Medium (biometric) |
| EEG headband (Muse) | muse-js over Web Bluetooth (no releases; maintenance uncertain) | Exploratory band power only | Spectral validation is a bioRxiv *preprint* ([bioRxiv](https://www.biorxiv.org/content/biorxiv/early/2021/11/04/2021.11.02.466989.full.pdf)). Krigolson 2021 reports about 40 ms Bluetooth lag and 33–37% of data lost to artifacts ([Frontiers](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2021.634147/pdf)). Not validated as an attention detector `research, M` | High. Lab tab only |
| Physiological flow classifier | Research only | Lab AUC of 0.889 for flow vs non-flow, where "non-flow" was an *overload* condition; 0.98 for rest vs work (single author, arXiv) | [arXiv 2006.10635](https://arxiv.org/abs/2006.10635) `research, L` | — |
| Calendar (optional) | Local ICS or OS calendar | Wind down before meetings | Endel CEO describes calendar-driven play as a *vision* ([TechCrunch](https://techcrunch.com/2022/05/20/endel-sony-partnership/)) `marketing, M` | Medium |
| **Your own overrides** | Logged when you touch any control | Implicit preference bands | Horvitz factors 11–12: keep a working memory of recent interactions and keep learning by observing ([PDF](https://erichorvitz.com/chi99horvitz.pdf)) `research (design principle), M` [V] | Low |

**Platform verdict** `fact, H`: a browser-only engine gets 60-second idle data, no app-switch data, and no Firefox or Safari support for idle detection or Bluetooth. It also hits two runtime limits:
- An `AudioContext` created before a user gesture starts "suspended", and you must call `resume()` after the gesture ([Chrome autoplay](https://developer.chrome.com/blog/autoplay)).
- Chrome *intensively throttles* timers in pages hidden for more than 5 minutes **that have been silent for at least 30 seconds**, checking them only once per minute. Pages that made sound in the last 30 seconds are exempt, and a silent track does not count ([Chrome timer throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88)).

So a Wind-down or break that fades to silence could cause the autonomy scheduler to stall. Run the autonomy clock in the Electron main process, or schedule against `AudioContext.currentTime` and an AudioWorklet, not `setTimeout` `inference, M`.

### Controller design (`inference, M`; every number is an unvalidated heuristic and should be exposed as a setting)

1. **Texture loop (1–90 s, no sensing):** generative micro-variation, meaning note choice, slow filter and timbre drift, and rare small events. It is limited by the style's **change budget** (salience per minute), which is kept low in focus styles because of the changing-state research ([Crossref, Jones 1992](https://api.crossref.org/works/10.1080/14640749208401304)).
2. **State loop:**
   - Sample every 5–10 s, aggregate into 60 s windows, then smooth with an exponential moving average (time constant 3–5 min).
   - Fuse into one **engagement** score and one **arousal** score, each z-scored against your personal baseline.
   - The states are Settling, Engaged, Drifting, Overloaded and Away. Enter Drifting after 3 windows below 0.35; leave only above 0.5.
   - At most **1 change per 5 minutes**, each step no more than about 10% of the parameter's range, applied as a 20–60 s `setTargetAtTime` glide (time constant = duration / 3 gives about 95% of the move) ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime) `fact, H`).
3. **Arc loop:** the session template above (ramp-in, hold, break proposal, wind-down, re-entry).
4. **Learning loop (across sessions):**
   - A **Thompson-sampling contextual bandit** over styles and parameter "arms". A bandit is a learner that mostly picks what has worked while still trying alternatives. Context: time bucket, task tag, recent session length. Reward: self-report taps plus finishing a session without a manual skip. Sources: [Russo et al.](https://arxiv.org/abs/1707.02038), [Spotify RecSys '25](https://arxiv.org/abs/2509.05460v1) `research, H`.
   - **Preferential Bayesian optimisation** with A/B "duels" over 3–6 continuous parameters in the style lab. It was shown to need drastically fewer comparisons, but only on *simulated* feedback ([ar5iv](https://ar5iv.labs.arxiv.org/html/1704.03651), [PMLR](https://proceedings.mlr.press/v70/gonzalez17a)) `research, H`.
   - **Promotion rule:** the bandit may *explore* freely within allowed bands, but it may only make a style the **default** after an n-of-1 trial clears a threshold set in advance (see the n-of-1 section).
5. **Meta-experiment:** randomly alternate days or sessions with **autonomy on** and **autonomy off** (a well-designed fixed arc). No study shows adaptive audio beats a good fixed arc ([verifier on claim 25](https://news.gallup.com/businessjournal/23146/too-many-interruptions-work.aspx)), so your own data has to settle it.

### Safeguards (`inference, M` unless noted)

- **Manual override always wins.** That parameter's autonomy freezes for a hold period (default 20 min). No autonomous change happens within 3 minutes of any override. When the hold ends, autonomy resumes from *your* new centre. Bloom's "evolve when idle" is the analogy ([Bloom](https://generativemusic.com/bloom.html)).
- **Hold (freeze all autonomy) and Stop each take one gesture.** Horvitz factor 6 requires efficient direct invocation and termination ([PDF](https://erichorvitz.com/chi99horvitz.pdf)). Only parameter *tweaks* are soft-locked during deep work.
- **Bad guesses are cheap:** every move is bounded, glided and logged with `{t, param, from, to, ruleId, inputs}`.
- **Hard limits:** a loudness ceiling and limiter, a maximum modulation depth, quiet hours, and no visual flashing above WCAG limits (see Safety).
- **Data:** all telemetry stays local (IndexedDB or SQLite), aggregates only, with export and delete. Autonomy that learns from your overrides narrows its own ranges, and asks only *after* a session ("you pulled Brightness down 4×; narrow its upper bound?"). Horvitz factor 5 supports using dialogue to resolve key uncertainties.

---

## Style data model (sketch)

`inference, M`. The structure draws on myNoise (bounded per-slider Low/High animation profiles that you can assign yourself), Ableton (macros with Min/Max and inversion), Noatikl (voice + rule objects, merged templates) and Endel (pre-designed logic plus an input layer). One engine, the control panel, sharing, morphing, mutation and the n-of-1 lab all operate on this one document.

```jsonc
Style {
  id, name, version, createdAt,
  parentIds: [],                    // lineage from duplicate / morph / mutate / merge / explore-bookmark
  origin: "authored"|"morph"|"mutation"|"merge"|"explore-bookmark",
  intentTags: ["focus-narrow"|"read-write"|"divergent"|"incubate"|"recover"|"breathe"|"wind-down"|"energise"|"explore"],
  evidenceBadge: "strong"|"small"|"speculative"|"user-discovered",   // shown in UI
  stateTarget: { arousal: [lo,hi], valence: [lo,hi], novelty: [lo,hi] },  // style-space region (design proposal, not validated taxonomy)
  taskGates: { speechLikeness: 0|null },            // read/write gate: no formants, no 4–5 Hz syllable-rate AM
  tuning: { root, scale | centsTable, chordPool, consonance: 0..1 },
  tempo: { bpm | "free", pulseStrength: 0..1 },
  layers: [{
    id, role: "drone"|"pad"|"pulse"|"texture"|"noise-bed"|"nature"|"melodic-fragment"|"breath-pacer"|"ai-texture",
    source: { type: "osc"|"fm"|"sample"|"granular"|"noise"|"prerendered-ai", params },
       // NOTE: no "rave" in the browser engine (no documented browser runtime; CC BY-NC 4.0) — native/experimental only
    rules: { scaleRef, harmonyRef, rhythm, nextNote, density },
    fx: { filter, reverb, delay, width }, gain, mute
  }],
  spectralEQ: [10 octave bands],                    // portable; device/hearing calibration stored separately
  modulators: [{ type: "lfo"|"random-walk"|"envelope"|"session-arc"|"input", source?: "clock"|"idle"|"hr"|"selfReport",
                 target, depth, rate }],
  macros: [{ id, label, value: 0..1, excludeFromMutate: bool,
             mappings: [{ param, min, max, curve }] }],   // min>max = inverted mapping
  snapshots: [{ name, macroValues, paramOverrides }],
  arc: { rampInMin, holdSoftCapMin, breakPolicy: { mode: "scheduled"|"suggest"|"learned", shortMin, longMin },
         windDownMin, reentry: { idleTriggerSec, holdMin } },
  autonomy: {
    enabled, level: 0..1,
    perParam: { "<path>": { range: [lo,hi], relative: bool, maxRatePerMin, slewSec, locked: bool } },
    changeBudget: { salientEventsPerMin, maxStepPct, minSecondsBetweenChanges },
    explorationRadius, idleHandbackSec, overrideHoldSec, learnFromOverrides: bool,
    allowedSignals: ["clock","idle","appSwitch","inputCadence","mic","hr","eeg"]
  },
  safety: { maxOutputDbA /* via calibration */, maxModDepth, amRateCaps, binauralAllowed: bool,
            weeklyDoseShare, visualFlashMaxHz: 3 },
  experiment: { blindCodename?, matchedLoudnessLUFS? }
}
```

Design notes:
- **Morphing:** continuous parameters interpolate (linear or eased on normalised values). Discrete ones (scale, sample, layer on/off) switch at the midpoint with crossfaded layer instances. That midpoint switch is a hedge and is unproven. Morphing through a learned latent space is smoother, but it has only been shown for a single FM synth with a trained model ([arXiv 2210.16984](https://arxiv.org/abs/2210.16984), [TASLP](https://orbi.umons.ac.be/bitstream/20.500.12907/49507/1/taslp24_accepted.pdf)) `research, M`. It is a later upgrade.
- **Storage:** an IndexedDB library, JSON export and import, and sharing as base64 JSON in the URL hash, as myNoise's "Save to URL" does. Avoid cookies: myNoise's "Save to Browser" uses a cookie, which clearing site data wipes ([myNoise help](https://mynoise.net/NoiseMachines/help.php)) `fact, H`.

---

## Control panel — macros, expert layer, transparency, style creation/morphing/mutation

### Tiers (`inference, M`)

| Tier | Contents | Precedent |
|---|---|---|
| **0: Session** | Start/Stop, style picker, session length and arc, **Hold** (freeze autonomy), **Autonomy amount** (0 = manual to 1 = full), task tag (Read/Write / Code / Ideate / Recover) | Endel and Brain.fm expose modes only ([Endel](https://endel.io/technology) `marketing, M`) |
| **1: Macros (4–6)** | **Intensity** (modulation depth); **Brightness / Warmth** (filter tilt); **Density** (events and voices); **Movement** (autonomy rate and LFO rates, i.e. how much of the change budget is used); **Space** (reverb and width); **Tonality** (consonance and scale complexity). Each macro shows its **allowed autonomy band** as a shaded range you can drag. | Brain.fm's "Neural Effect Level" is modulation heard as "thrumming", and "more is not better for everyone" ([help](https://brainfm.helpscoutdocs.com/article/46-neural-effect-filter); undated and partly stale). Lyria RealTime's own controls (density, brightness, scale) independently confirm this vocabulary ([Gemini docs](https://ai.google.dev/gemini-api/docs/realtime-music-generation)). myNoise Animate has Low/High profiles you can set yourself ([help](https://mynoise.net/NoiseMachines/help.php)) |
| **2: Workshop pages** | One page per layer or subsystem, at most 8 parameters each, mappable to Web MIDI CCs | Bitwig remote-control pages of 8 knobs (secondary sources only [W]: [Bonedo](https://www.bonedo.de/artikel/bitwig-studio-tutorial-2-midi-controller-und-remote-controls)). The OP-1 precedent is [U] |
| **3: Expert** | Modulation graph, macro→parameter mapping table (min/max/curve, inversion), raw JSON editor, signal and policy thresholds, experiment designer | Ableton racks: up to 16 macros, any number of mappings each, Min > Max inverts, Variations, Rand with per-macro exclusion. Only *Instrument Rack preset Volume* macros are excluded by default ([Ableton manual](https://www.ableton.com/en/manual/instrument-drum-and-effect-racks/)) `fact, H` |

### Transparency (calm in-session, full detail afterwards)

- **During a session:** one peripheral surface showing a one-word phase label (Settling / Deep / Drift / Break / Wind-down), elapsed time, and macro dots moving slowly inside their bands. **No toasts, prompts or rating requests.** Calm Technology heuristics such as "smallest possible amount of attention", "make use of the periphery" and "communicate without speaking" apply ([calmtech.com](https://calmtech.com/), Amber Case). These are design guidance, not research [W]. myNoise's mini-player exists, but there is no evidence it stays always-on-top [C]. Build your own always-on-top Electron mini window.
- **After a session:** a timeline of every autonomous decision with its rule ID and inputs, your overrides, bookmarks, the arc, and an optional one-tap rating. Then suggestions to narrow ranges based on your overrides.

### Creating new styles (each flow has a verified precedent)

1. **Duplicate and edit** in the workshop.
2. **A/B morph:** pick two styles or snapshots, scrub a crossfader, and save any point. Precedent: Octatrack scene crossfader, 16 scenes, 8 per side ([Elektronauts](https://www.elektronauts.com/t/octatrack-tutorial-scenes-the-basics-some-advanced-stuff/9482), [CME](https://www.chicagomusicexchange.com/products/elektron-octatrack-mkii-dynamic-performance-sampler-1914768)) `fact, M`. A morph can also serve *as* an arc, for example ramping from Settle to Deep.
3. **Mutate around a seed:** show 6–12 branches at a radius you choose. Locked and excluded genes are never touched, and loudness parameters are excluded by default. Audition a branch with a crossfade, then **Plant** it as a child style. Precedent: Synplant 2, with 12 branches, distance setting divergence, plant-as-new-seed, and a 48-gene DNA editor ([MusicTech](https://musictech.com/reviews/plug-ins/sonic-charges-synplant-2-review/), [CDM](https://cdm.link/synplant-2-hands-on/)) `fact, M`.
4. **Merge layers** from several styles. Precedents: Noatikl's merged templates ([Intermorphic](https://intermorphic.com/noatikl/); Noatikl was retired in 2017, and Wotja's parameter counts are [U]) and myNoise composites (up to 10 sliders) ([app guide](https://mynoise.net/appGuide.php)).
5. **Duel-tune:** preferential Bayesian optimisation A/B duels over 3–6 parameters (see Controller).
6. **Explore sessions:** widen the bands and the exploration radius. The engine bookmarks states it visits, and you mark "keep this" with one key. After the session the bookmarks become candidate styles, tagged with a post-session state report (focus, insight, calm, restless, other). This is the channel through which "other cognitive understandings" surface.
7. **Grow a sound source with AI, offline only:**
   - Stable Audio Open Small: 341M parameters, clips up to 11 s, Community License; check the revenue terms ([Stability](https://stability.ai/news-updates/stability-ai-and-arm-release-stable-audio-open-small-enabling-real-world-deployment-for-on-device-audio-control)).
   - In-browser MusicGen through Transformers.js v3 / WebGPU exists (Xenova Space) but is not real-time ([HF blog](https://www.huggingface.co/blog/transformersjs-v3), [Space](https://huggingface.co/spaces/Xenova/musicgen-web)) [W].
   - Not viable as the core engine: Magenta RealTime 2 streams in real time only on Apple Silicon; NVIDIA is supported offline only ([MRT2](https://magenta.tensorflow.org/magenta-realtime-2), [GitHub](https://github.com/magenta/magenta-realtime)). Lyria RealTime is cloud-only, experimental and watermarked. It needs the **full config on every update** (fields you leave out reset), silently ignores filtered prompts, and makes hard transitions on BPM or key changes ([docs](https://ai.google.dev/gemini-api/docs/realtime-music-generation)). RAVE is **CC BY-NC 4.0** with no browser runtime ([LICENSE](https://raw.githubusercontent.com/acids-ircam/RAVE/master/LICENSE)) `fact, H`.

**Competitive gap** `inference, L` [U]: none of the products checked combines bounded autonomous drift, an editable macro schema, and morph or mutate authoring for focus audio. myNoise comes closest (Low/High animation bands you set, URL presets, composites) but has no session arc and no mutation. The market scan was incomplete.

---

## Beyond focus — state table

All anchors are **hypotheses to test on yourself**, not "evidence-based settings" [C]. dBA values assume a calibrated output level (see Safety).

| State | Sonic properties / ranges (proposed) | Evidence strength | Source |
|---|---|---|---|
| **Focus: narrow beam** (the proposed default; rename it) | Quiet: about 45–60 dBA, or near silence as one arm. Low change budget, slow glides, steady bed, low novelty. **Noise bed optional and calibrated per user.** Optional amplitude modulation (around 16 Hz), user-controlled | **Weak to mixed.** No study tests a 50–60 dBA pink or brown bed for focus. White and pink noise give g = −0.21 in people without ADHD and +0.25 with ADHD. No brown-noise studies qualified. The amplitude-modulation benefit is mostly in high-ADHD listeners | [Nigg 2024](https://ohsu.elsevierpure.com/en/publications/systematic-review-and-meta-analysis-do-white-noise-or-pink-noise-), [Woods 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11499863/), [Jones 1992](https://api.crossref.org/works/10.1080/14640749208401304) |
| **Read / Write gate** (a hard constraint that overlays any style) | Speech-likeness = 0: no vocal formants, no intelligible babble, no 4–5 Hz syllable-rate modulation. Instrumental only | **Strong.** A meta-analysis of 65 studies finds intelligible speech and lyrical music the most disruptive and noise a small but reliable disruption. A follow-up experiment (Vasilev, Hitching & Tyrrell) found instrumental music did not slow reading. The lyrical d = −0.35 figure is [U] | [APS 2018](https://www.psychologicalscience.org/journals/perspectives/1745691617747398/), [Bournemouth eprint (a *different* paper, re-attributed [C])](https://eprints.bournemouth.ac.uk/38543/1/Preprint_rev1.pdf), [Kämpfe 2011](https://journals.sagepub.com/doi/10.1177/0305735610376261) |
| **Divergent / Ideation** | Livelier: about 60–70 dBA *total* including the room, never near 85. Diffuse, unintelligible "café" texture. Major mode, brighter, more variation, looser change budget. Breaks matter more here | **Weak.** Mehta 2012 (one consumer-research lab, 5 experiments) found 70 > 50 dB and 85 dB harmful. No adult replication found. A study in children (Massonnié 2019, n = 44) found no benefit. Happy music beat silence on divergent thinking (d = .55), but this did not survive multiple-comparison correction. The "70 dB sweet spot" quote is removed [C] | [OUP](https://academic.oup.com/jcr/article-abstract/39/4/784/1798283), [Frontiers 2019](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.00381/full), [Ritter 2017](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0182210), [Albulescu](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272460) |
| **Incubate** (after a focus block) | 10–15 min of low-demand, mildly engaging sound (nature or ambient). You step away from the problem | **Weak / contested.** Baird 2012 (n = 145) varied task demand, not sound, and Murray 2024 failed to replicate it (as reported by McDaniel 2025). Steindorf 2021 and Smeekens & Kane 2016 found no link between mind-wandering and creative improvement. McDaniel 2025, however, found incubation mind-wandering *predicted* gains in a writing task | [Baird PDF](https://www.cmhp.ucsb.edu/sites/default/files/2018-12/Baird%20et%20al.%20%282012%29%20Inspired%20by%20distraction.pdf), [McDaniel 2025 Sci Rep](https://pmc.ncbi.nlm.nih.gov/articles/PMC12241419/), [Steindorf 2021 record](https://heibib.ub.uni-heidelberg.de/search/Record/178452798X) |
| **Restore** (break interlude) | 2–10 min of natural soundscape (water, sparse birds), synthesised to avoid sample licensing | **Moderate.** Short exposure to nature sound improved directed attention more than urban sound, and not through mood. Measure it in-app with a digit-span probe | [Van Hedger 2019](https://pubmed.ncbi.nlm.nih.gov/30367351/) |
| **Recover / Calm** | About 40–50 dBA, water and birds, fewer events, darker spectrum. Success = HR falling toward baseline (strap optional) | **Moderate.** Meta-analysis (18 studies) gives stress/annoyance g = −0.60 [−0.97, −0.23]. The bird estimate rests on 2 studies and contains a sign typo. Alvarsson 2010 found nature beat *80 dBA* traffic, **not** equally loud traffic [C]. No HRV effect | [Buxton 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8040792/), [Alvarsson 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC2872309/) |
| **Breathe / Body** | A breathing pacer at **4.5–6.5 breaths/min** (0.075–0.108 Hz), carried as an amplitude or filter swell (inhale on the rise). The rate is personalised; not fixed at 6 | **Moderate to strong, but only for active paced breathing.** HRV biofeedback: g = 0.83 vs control (24 studies, self-report outcomes). Resonance frequency sits between 4.5 and 6.5 bpm [C: was "5.5" / "up to 7"]. Passive listening is unproven | [Goessl 2017](https://www.cambridge.org/core/product/identifier/S0033291717001003/type/journal_article), [Shaffer & Meehan 2020](https://www.frontiersin.org/articles/10.3389/fnins.2020.570400/pdf) |
| **Wind-down / pre-sleep** | **25–60 min** [C: was 25–50], slow pulse (< ~60 bpm, inferred), low density, dark spectrum, quiet, fade to silence | **Moderate certainty for *self-rated* sleep quality** in insomnia (PSQI MD −2.79). Objective sleep **not** improved (3 studies). High risk of performance bias | [Europe PMC, Cochrane CD010459.pub3](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:%2210.1002/14651858.CD010459.pub3%22&resultType=core&format=json), [NeurologyLive](https://neurologylive.com/view/music-nonpharmacological-intervention-improving-insomnia-symptoms-adults) |
| **Energise / Reset** (movement break) | About **115–125 bpm** [C: was 120–140], major mode, strong pulse, short | **Weak for cognition.** The evidence comes from *exercise*. In Karageorghis 2008, medium tempo (115–120) beat fast (140–145) on preference and *flow* at 70% maxHRR. The "+15% time to exhaustion" figure is [U]. Tempo affects arousal and mode affects mood (Husain 2002: 165 vs 60 bpm) | [Karageorghis 2008](https://shura.shu.ac.uk/18180/1/Psychological%20effects%20of%20music.pdf), [Husain 2002](https://sites.utm.utoronto.ca/sites/sites.utm.utoronto.ca.glenn_website/files/download/Husain.pdf), [Thompson 2001](https://sites.utm.utoronto.ca/sites/sites.utm.utoronto.ca.glenn_website/files/download/Thompson2001.pdf) |
| **Attention-boost profile** (only if ADHD or inattentive traits apply) | Higher noise-bed level, tested from *low upward*. Never copy Söderlund's ~80 dB for long sessions | **Small.** Nigg g = +0.25 (k = 13). Söderlund 2024 (n = 43): inattentive traits benefited and hyperactive traits did worse, but the auditory model was borderline (p = .055) [W] | [Nigg 2024](https://ohsu.elsevierpure.com/en/publications/systematic-review-and-meta-analysis-do-white-noise-or-pink-noise-), [Söderlund 2024](https://reference-global.com/2/v2/download/article/10.2478/sjcapp-2024-0010.pdf) |
| Binaural or isochronic beats | A texture to experiment with only. No claims about "alpha" or "theta" states | **Inconsistent mechanism.** Of 14 studies, 5 support entrainment and 8 contradict it. A behavioural meta-analysis found g = 0.45, with heterogeneous methods | [Ingendoh 2023](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0286023), [Garcia-Argibay 2019](https://pubmed.ncbi.nlm.nih.gov/30073406/) |
| 40 Hz "gamma" | **Excluded as a cognitive mode.** Aesthetic texture only, never paired with 40 Hz flicker | **Investigational.** HOPE (NCT05637801, about 673 enrolled) is listed as **completed** (primary completion 22 Jun 2026), with no results posted as of 9 Sep 2026. The company said topline data were due later in 2026, and none was found. In OVERTURE the primary endpoint (MADCOMS) **failed** (p = .68), and its 76–77% figures are exploratory `marketing` | [ClinicalTrials.gov](https://clinicaltrials.gov/api/v2/studies/NCT05637801), [Hajós 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10957179), [HLTH Mar 2026](https://hlth.com/insights/news/cognito-therapeutics-raises-105m-series-c-led-by-morningside-ventures-to-advance-spectris-platform-for-alzheimer-s-2026-03-06) |
| Sleep slow-wave memory boost | **Out of scope.** Needs real-time EEG phase detection | **Declining.** Ngo 2013 (n = 11; 8 of 11 noticed the sounds). Harlow 2023: pooled d = 0.14, and the effect falls with publication year to d = −0.39 (2021). The Wunderlin and Stanyer comparison figures are [U]. Stanyer's corrected d is about 0.19 per an error report | [Ngo 2013](https://www.inb.uni-luebeck.de/fileadmin/files/PUBPDFS/NgMaBoMo13.pdf), [Harlow 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC12713896/), [Jané report](https://matthewbjane.quarto.pub/meta-analysis-error-reports/reports/report-2/report-2.html) |

**Shared axes** `inference, M`: one controller can move between all of these states using **arousal** (tempo, density, brightness, level), **valence** (mode, consonance), **novelty / change budget**, **spectral tilt** (white → pink → brown), **natural ↔ synthetic**, and a hard **speech-likeness gate**. This rests on the finding that the "Mozart effect" reduces to arousal and mood (Thompson 2001). Moves between anchors happen over minutes.

---

## Discovering new cognitive effects honestly (n-of-1 method)

**Why it is needed:**
- Average effects are small and often reverse between subgroups (Nigg; Söderlund, borderline).
- Blinding fails easily: 8 of 11 participants in Ngo 2013 heard the stimuli, and about 34% across the studies in Harlow 2023.
- The reliability of the difference scores in Harlow 2023 was about 0.01.
- Feeling that something "helps" is plausibly arousal or mood (Thompson 2001). That it is *mostly* this is our inference [W].

**"Discovery Lab" protocol** (`inference, M`; standard n-of-1 design). The AHRQ / Kravitz 2014 guide was not retrieved [U], so confirm crossover counts and washout lengths before relying on the defaults below.

1. **Question:** "Does style A beat B for task type T, *for me*?" Write it down before the trial starts, with one **primary outcome**.
2. **Arms:** A, B, and a **matched-loudness control**: quiet or silence, or a steady bed. Silence is a legitimate arm given Nigg's harm result in people without ADHD.
3. **Randomise and counterbalance** blocks across days. Aim for about 6–10 blocks per arm, with short washouts. Avoid always running a given arm first (Woods found order effects).
4. **Blinding:** neutral codenames, loudness-matched (LUFS), and differences hidden behind matched timbre where possible. Afterwards, ask "which arm do you think that was?" to measure how often blinding broke.
5. **Objective probes in the app** (≤ 3 min, at the start and end of blocks):
   - 60 s digit span or n-back (directed attention);
   - a 3-minute psychomotor vigilance test (PVT) for vigilance;
   - an alternative-uses prompt, scored later and blind (divergent thinking);
   - remote associates items (convergent thinking);
   - or passive work metrics: words, commits, minutes until your first self-chosen break.
6. **Covariates** (one-tap): sleep, caffeine, time of day, mood 1–5, task type, plus a free-text **"unexpected effect"** field.
7. **Analysis:** Bayesian, with a shrinkage prior centred on 0 (pulling estimates toward "no effect" until the data push back), an explicit **"not enough evidence yet"** state, and a promotion threshold (for example P(benefit) > 0.9 on the primary outcome) set in advance. The bandit may explore, but only the lab may promote a style to default.
8. **Emergent states:** cluster the free-text tags and post-session reports from Explore sessions over time. Clusters that recur (for example "spatial clarity" or "emotional processing") become **new hypotheses**, each with its own preregistered trial. Never treat them as conclusions. A style that clears a trial earns the **user-discovered** evidence badge.
9. **Autonomy itself is a trial arm:** autonomy on vs autonomy off over the same style.

---

## Safety

- **Hearing dose** `fact, H` [V]:
  - WHO-ITU safe listening for personal audio: **80 dBA for 40 hours a week**. NIOSH: 85 dBA averaged over 8 hours, 3 dB exchange rate (protects about 92% of workers over 40 years; the figure comes from Eichwald). [CDC/NIOSH](https://www.cdc.gov/niosh/noise/about/noise.html), [PMC10194210](https://pmc.ncbi.nlm.nih.gov/articles/PMC10194210/).
  - Build a weekly dose meter (3 dB exchange): 80 dBA = 40 h, 83 = 20 h, 86 = 10 h, 70 ≈ 400 h.
  - Web Audio cannot know absolute sound pressure level, so require a one-time **calibration** (phone SPL meter or reference tone) per headphone and output device.
  - Default cap around 60–65 dBA. Going above 75 dBA needs explicit opt-in and a time limit. Calibration problems across Windows audio and headphones are an open question.
- **Photosensitivity** `fact, H` [W]: WCAG 2.3.1 allows no more than 3 flashes in any one second unless they are below the general and red flash thresholds (a 10% luminance change where the darker state is below 0.80; saturated red where R/(R+G+B) ≥ 0.8; an area of about 25% of a 10° field). The "below 50 Hz" qualifier was not found; "3 to 50 Hz" refers to the old WCAG 1.0 rule [C]. [W3C](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html). Any visualiser must hard-limit itself to ≤ 3 Hz and avoid saturated red flashes.
- **Modulation fatigue:** cap amplitude-modulation depth and rate per style, keep the "Intensity" macro under your control, and keep the default moderate (Brain.fm: "more is not better for everyone") `marketing, M`.
- **No medical claims:** no ADHD treatment, sleep-therapy, Alzheimer's or "brainwave state" claims. Present breaks as being about energy, not productivity (Albulescu).
- **Privacy:** all sensing is opt-in per signal, stored locally and aggregate-only. Never store keystroke content, audio recordings or window titles. Category-level app data only. Show a visible indicator whenever the mic or Bluetooth is active.
- **Licensing:**
  - RAVE is **non-commercial** (CC BY-NC 4.0).
  - Stable Audio Open Small uses the Community License, whose revenue terms need checking.
  - The Magenta RealTime 2 weights licence is [U].
  - Lyria output is always watermarked.
  - **Endel's name, mode names and audio** must not be used.
- **Autonomy safety:** override always wins, Hold and Stop take one gesture, changes are glided and logged, quiet hours apply, and the level never rises autonomously above your set ceiling.

---

## Open questions for the user

1. **Name of the focus default.** "Deeper Focus" is Endel's mode name, and "Deep Work" is Brain.fm's. Choose your own; candidates are "Narrow Beam", "Still Water" or a codename.
2. **Shell:** OK to wrap the Web Audio engine in **Electron or Tauri** on Windows? Without it, autonomy loses second-level idle detection, lock events and app-switch data, and risks throttled timers during silent phases.
3. **Which signals are acceptable:** self-report, clock, idle and lock, input *counts*, app *category*, mic level, chest strap, EEG? Per-signal opt-in is assumed.
4. **Do you have ADHD or inattentive traits?** This decides whether a noise bed is a likely help or a likely slight harm, and whether the attention-boost profile appears.
5. **Main task mix** (reading/writing vs coding vs ideation vs admin)? The speech gate and the default style depend on it. There is no evidence base specific to coding.
6. **Wearable:** do you own a BLE chest strap that broadcasts real RR intervals (for example a Polar H-series)? A wrist watch usually won't stream standard BLE heart rate to Windows [U].
7. **How much measurement will you tolerate:** about 1–3 minutes of probes per block for n-of-1 trials, or passive work metrics only?
8. **Personal or distributed:** is this a personal tool, or might it ship? That changes licensing (RAVE, Stable Audio) and privacy obligations.
9. **AI texture layer:** want offline-generated textures (Stable Audio Open Small, browser MusicGen) in phase 1, or pure DSP first?
10. **Breaks:** should the engine *schedule* breaks by default (Biwer favours this), only suggest them, or stay silent?
11. **Calibration:** willing to do a one-time level calibration with a phone SPL app, so the dose meter and dBA anchors mean something?

---

## Corrections applied versus strand drafts (summary)

- The 15-minute figure has an anecdotal Spolsky / *Peopleware* lineage. The Slavet/Forbes attribution was dropped.
- Mark: interview 23:15 vs CHI 2005 25:26 (SD ≈ 54 min). Both measure time to resume, not time to refocus.
- The vigilance "5 min / 42-study meta-analysis" claim was dropped. The early-decrement claim is now sourced to Rann & Almor 2025.
- Ceja & Navarro 2011 "75% chaotic" is [U]. The 2008 paper reports 80%.
- The "Leiden dissertation" is actually Scheepers & Keller 2022, a journal article.
- Woods 2024: the order effect is from Experiment 1; the rate study had n = 82; depth had no effect.
- The "medRxiv ρ" values are [U]. Kowatsch's field study found no mouse–arousal link.
- Web Bluetooth "no flag on Windows" is [U], and the Polar H7 testing was informal.
- The Muse spectral validation is a preprint.
- RAVE was removed as a browser source type (CC BY-NC 4.0). In-browser MusicGen exists but is not real-time.
- Calm Tech is design heuristics, not research. The myNoise mini-player is not shown to be always-on-top. Soft-lock is limited to tweaks (Horvitz factor 6).
- Changing-state hypothesis upgraded to verified (Jones 1992; Jones & Macken 1993).
- The Mehta "sweet spot" quote was removed.
- Alvarsson: nature beat only *80 dBA* traffic.
- Resonance breathing range is 4.5–6.5 bpm.
- Cochrane: 25–60 min, subjective sleep only.
- Energise tempo lowered to about 115–125 bpm.
- The "Vasilev preprint" is a different paper.
- 40 Hz: HOPE completed with no posted results; the OVERTURE primary endpoint failed.
- WCAG: the "below 50 Hz" qualifier is unsupported.
- Baird incubation failed to replicate (Murray 2024, per McDaniel 2025).
- Wotja parameter counts, Bitwig/OP-1 paging, Smits 2026, the Endel resting-HR claim, the Kotler/Benson link, and the AHRQ n-of-1 guide all remain [U].

---

## Sources (grouped)

**Flow, interruption, breaks, vigilance**
- https://en.wikipedia.org/wiki/Flow_(psychology)
- https://www.joelonsoftware.com/2000/08/09/the-joel-test-12-steps-to-better-code/
- https://www.goodreads.com/notes/20528604-the-rise-of-superman/20540607-troy-erstling/bfa78b88-d963-4e5d-8fcc-9058b98ec77f
- https://bigthink.com/videos/steven-kotler-on-the-science-of-flow-states (403, not verified)
- https://diposit.ub.edu/items/33ae6dc9-04cd-4f54-b671-7c6c6eefbd3e/full
- https://www.uv.es/docpot/publi_recientes_ceja.htm
- https://news.gallup.com/businessjournal/23146/too-many-interruptions-work.aspx
- https://siliconcanals.com/t-work-interruptions-23-minutes-275-pings-organisational-focus/
- https://www.strategy-business.com/article/re00088
- https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.01504/full
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12504179/
- https://experts.illinois.edu/en/publications/brief-and-rare-mental-breaks-keep-you-focused-deactivation-and-re/
- https://www.springermedicine.com/brief-mental-breaks-and-content-free-cues-may-not-keep-you-focus/25692108
- https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272460
- https://cris.maastrichtuniversity.nl/en/publications/understanding-effort-regulation-comparing-pomodoro-breaks-and-sel
- https://pubmed.ncbi.nlm.nih.gov/36859717/
- https://www.mdpi.com/2076-328X/16/7/1158 (403, not verified)
- https://en.wikipedia.org/wiki/Basic_rest%E2%80%93activity_cycle
- https://www.bisp-surf.de/Record/PU199501075076

**Physiology and sensing**
- https://research.uni-luebeck.de/en/publications/the-relation-of-flow-experience-and-physiological-arousal-under-s/
- https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.01716/full
- https://scholarlypublications.universiteitleiden.nl/access/item%3A3513837/view
- https://arxiv.org/abs/2006.10635
- https://www.medrxiv.org/content/10.1101/2025.08.02.25332538 (403, not verified)
- https://journalnews.com.ph/detecting-stress-in-the-office-from-how-people-type-and-click/
- https://alexandria.unisg.ch/bitstreams/237cf397-9595-46b7-9cd7-733b94de3682/download
- https://developer.chrome.com/articles/idle-detection
- https://www.electronjs.org/docs/latest/api/power-monitor
- https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getforegroundwindow
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API
- https://github.com/adafruit/Adafruit_CircuitPython_BLE_Heart_Rate/blob/master/adafruit_ble_heart_rate.py
- https://www.guyrutenberg.com/2026/04/04/web-hr-monitor-heart-rate-and-hrv-in-the-browser/
- https://github.com/urish/muse-js
- https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2021.634147/pdf
- https://www.biorxiv.org/content/biorxiv/early/2021/11/04/2021.11.02.466989.full.pdf

**Browser runtime**
- https://developer.chrome.com/blog/autoplay
- https://developer.chrome.com/blog/timer-throttling-in-chrome-88
- https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime

**Learning and interaction design**
- https://arxiv.org/abs/1707.02038
- https://arxiv.org/abs/2509.05460v1
- https://ar5iv.labs.arxiv.org/html/1704.03651
- https://proceedings.mlr.press/v70/gonzalez17a
- https://erichorvitz.com/chi99horvitz.pdf
- https://calmtech.com/

**Products and precedents**
- https://endel.io/technology
- https://techcrunch.com/2022/05/20/endel-sony-partnership/
- https://appshunter.io/editorials/1485573652 (403, not verified)
- https://www.brain.fm/blog/adaptive-focus-music-technology-brain-fm
- https://brainfm.helpscoutdocs.com/article/46-neural-effect-filter
- https://mynoise.net/NoiseMachines/help.php
- https://mynoise.net/NoiseMachines/whiteNoiseGenerator.php
- https://mynoise.net/appGuide.php
- https://generativemusic.com/bloom.html
- https://intermorphic.com/noatikl/
- https://apps.microsoft.com/detail/9ncnrd5v5c23?hl=en-US
- https://generative.fm/
- https://github.com/generativefm/generators
- https://www.ableton.com/en/manual/instrument-drum-and-effect-racks/
- https://www.bonedo.de/artikel/bitwig-studio-tutorial-2-midi-controller-und-remote-controls
- https://forum.renoise.com/t/remote-controls-macro-pages-feature-request/65269
- https://www.elektronauts.com/t/octatrack-tutorial-scenes-the-basics-some-advanced-stuff/9482
- https://www.chicagomusicexchange.com/products/elektron-octatrack-mkii-dynamic-performance-sampler-1914768
- https://musictech.com/reviews/plug-ins/sonic-charges-synplant-2-review/
- https://cdm.link/synplant-2-hands-on/
- https://soniccharge.com/synplant

**Generative AI audio**
- https://arxiv.org/abs/2210.16984
- https://orbi.umons.ac.be/bitstream/20.500.12907/49507/1/taslp24_accepted.pdf
- https://ai.google.dev/gemini-api/docs/realtime-music-generation
- https://magenta.tensorflow.org/lyria-realtime
- https://magenta.tensorflow.org/magenta-realtime-2
- https://github.com/magenta/magenta-realtime
- https://magenta.tensorflow.org/magenta-realtime
- https://arxiv.org/abs/2508.04651
- https://arxiv.org/abs/2111.05011
- https://github.com/acids-ircam/RAVE
- https://raw.githubusercontent.com/acids-ircam/RAVE/master/LICENSE
- https://stability.ai/news-updates/stability-ai-and-arm-release-stable-audio-open-small-enabling-real-world-deployment-for-on-device-audio-control
- https://www.huggingface.co/blog/transformersjs-v3
- https://huggingface.co/spaces/Xenova/musicgen-web
- https://opensource.microsoft.com/blog/2024/02/29/onnx-runtime-web-unleashes-generative-ai-in-the-browser-using-webgpu/

**Irrelevant sound, reading, music and cognition**
- https://api.crossref.org/works/10.1080/14640749208401304
- https://api.crossref.org/works/10.1037/0278-7393.19.2.369
- https://en.wikipedia.org/wiki/Irrelevant_speech_effect
- https://www.psychologicalscience.org/journals/perspectives/1745691617747398/
- https://eprints.bournemouth.ac.uk/38543/1/Preprint_rev1.pdf
- https://journals.sagepub.com/doi/10.1177/0305735610376261
- https://Www.Gwern.net/doc/music/music-distraction/2011-kampfe.pdf
- https://sites.utm.utoronto.ca/sites/sites.utm.utoronto.ca.glenn_website/files/download/Thompson2001.pdf
- https://sites.utm.utoronto.ca/sites/sites.utm.utoronto.ca.glenn_website/files/download/Husain.pdf
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11499863/

**Creativity and incubation**
- https://academic.oup.com/jcr/article-abstract/39/4/784/1798283
- https://www.sciencedaily.com/releases/2012/06/120619230057.htm
- https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.00381/full
- https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0182210
- https://www.cmhp.ucsb.edu/sites/default/files/2018-12/Baird%20et%20al.%20%282012%29%20Inspired%20by%20distraction.pdf
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12241419/
- https://heibib.ub.uni-heidelberg.de/search/Record/178452798X

**Calm, recovery, breathing, sleep**
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8040792/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC2872309/
- https://pubmed.ncbi.nlm.nih.gov/30367351/
- https://www.cambridge.org/core/product/identifier/S0033291717001003/type/journal_article
- https://open.bu.edu/handle/2144/26911
- https://www.frontiersin.org/articles/10.3389/fnins.2020.570400/pdf
- https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:%2210.1002/14651858.CD010459.pub3%22&resultType=core&format=json
- https://neurologylive.com/view/music-nonpharmacological-intervention-improving-insomnia-symptoms-adults
- https://www.inb.uni-luebeck.de/fileadmin/files/PUBPDFS/NgMaBoMo13.pdf
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12713896/
- https://matthewbjane.quarto.pub/meta-analysis-error-reports/reports/report-2/report-2.html

**ADHD, noise, entrainment, exercise tempo**
- https://ohsu.elsevierpure.com/en/publications/systematic-review-and-meta-analysis-do-white-noise-or-pink-noise-
- https://reference-global.com/2/v2/download/article/10.2478/sjcapp-2024-0010.pdf
- https://pubmed.ncbi.nlm.nih.gov/17683456/
- https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0286023
- https://pubmed.ncbi.nlm.nih.gov/30073406/
- https://shura.shu.ac.uk/18180/1/Psychological%20effects%20of%20music.pdf

**40 Hz**
- https://clinicaltrials.gov/api/v2/studies/NCT05637801
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10957179
- https://www.neurologylive.com/view/cognito-gamma-sensory-stimulation-leads-preserved-corpus-callosum-structure-alzheimers
- https://medtechspectrum.thebiostartups.com/news/3/24493/cognito-therapeutics-completes-enrollment-in-hope-pivotal-trial-for-spectris-ad-therapy.html
- https://hlth.com/insights/news/cognito-therapeutics-raises-105m-series-c-led-by-morningside-ventures-to-advance-spectris-platform-for-alzheimer-s-2026-03-06

**Safety standards**
- https://www.cdc.gov/niosh/noise/about/noise.html
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10194210/
- https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
