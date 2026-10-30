# Deeper Focus — research

Compiled 2026-10-13. Five research strands (Endel, science, landscape, engine, measurement), each checked by an adversarial verification pass. Refuted details have been dropped or corrected, and weakened ones are flagged.

**Labels:** **[F]** verified fact · **[M]** company marketing or interview claim (not tested) · **[R]** research evidence (peer-reviewed or preprint; strength noted) · **[I]** our inference · **[?]** unverifiable or not found.

---

## Bottom line

1. "Deeper Focus" is not a separate engine or science mode. It is one artist soundscape, *Plastikman: Deeper Focus* (Richie Hawtin, April 2021). It runs on Endel's standard generative engine, which recombines Hawtin's stems in real time using rules attached to each stem. [F] https://endel.io/pages/newsroom/press-releases/plastikman/Endel-PressRelease-EndelxPlastikman.pdf
2. No source publishes its BPM, key, instruments, spectrum or arrangement rules. Every public description agrees on the character: minimal techno that is "spacious, stripped-back", "subtractive" and "hypnotic", with a steady pulse and deliberate silence. [M] https://deeper.endel.io/
3. No study has tested Deeper Focus. The only Endel EEG study (Haruvi et al. 2022) used Endel's generic "Focus" soundscape with stimuli gathered in September 2020, before Deeper Focus existed. The "7x" figure does not appear in that paper, so the 2026 press attribution of "7x" to Deeper Focus is a misattribution. [F] https://pmc.ncbi.nlm.nih.gov/articles/PMC8829886/
4. The science is more solid about what harms focus than about what helps it. Speech or lyrics, segmented pitch or timbre change, sudden "deviant" events and loudness jumps reliably disrupt (mainly in serial-recall tasks). Steady, predictable sound does little harm. [R]
5. On the helping side, the evidence is small and was funded by the companies involved. Beat-locked ~16 Hz amplitude modulation (Brain.fm) helped listeners with high ADHD-symptom scores (p=0.048). White or pink noise helps people with ADHD slightly and hurts others slightly. Binaural beats, isochronic tones and 40 Hz audio have weak or no support. [R]
6. Our working hypothesis for the focus signature [I]:
   - a steady pulse the listener can get used to;
   - a sparse, dry arrangement with negative space;
   - timbral change slow enough to go unnoticed;
   - no song form, no deviant events, no vocals;
   - stable loudness;
   - possibly band-limited fast amplitude texture, to be checked in the recording.
7. Build a Faust DSP core running in a local Chrome/Edge AudioWorklet page as the tuning tool. Expose every signature property as a named parameter that maps one-to-one onto a metric computed from the user's WASAPI-loopback recording, so tuning becomes a matching exercise. The same Faust source can later be compiled to native hosts for an app.
8. Before any public release, a freedom-to-operate check is needed. Endel, Brain.fm and Arctop all hold granted patents near this design space.

---

## What Endel Deeper Focus is (fact vs marketing vs unknown)

### Verified facts
- **Launch.** Press release dated 15 Apr 2021: iOS/macOS on 15 Apr, Android and Alexa "on April 22". Amazon Science gives 30 Apr for Alexa, so the two sources conflict. It was Endel's second artist soundscape, after Grimes' *AI Lullaby*. Sources: [press release](https://endel.io/pages/newsroom/press-releases/plastikman/Endel-PressRelease-EndelxPlastikman.pdf), [Amazon Science](https://www.amazon.science/latest-news/how-endels-ai-powered-focus-soundscapes-earned-the-backing-of-neuroscience). [F]
- **How it was made.** Hawtin, Stavitsky, Evgrafov and Temen created "original sounds and productions matching both his artistic vision and Endel's psychoacoustic requirements". The stems were then "processed by Endel AI", adapting to location, weather, natural light and heart rate, "with beats synced to heart rate". Hawtin: "the AI is the one who decides the final framework" (press release; also in [MusicTech](https://musictech.com/news/richie-hawtin-plastikman-endel-create-ai-powered-soundscape-deeper-focus)). MusicTech calls the material "newly recorded Plastikman sounds". [F]
- **Method.** Hawtin built sounds and effect chains and gave every sound, stem and effect attributes that define how it may play and what it may combine with. He also supplied "rough basic level frameworks of tracks". The team then iterated on "samples, rules and assumptions" ([Beatportal](https://www.beatportal.com/articles/452112-we-talk-to-richie-hawtin-about-deeper-focus-his-collaborative-soundscape-with-endel-ai-to-get-you-focused)). Hawtin in [Attack Magazine, 12 May 2021](https://www.attackmagazine.com/features/interview/the-potential-of-ai-limitless-richie-hawtin/): "a lot of randomization and generative LFO's"; "I knew what textures and modulations I could bake into the samples"; "I had to know exactly where I could give up control". [F, as quotes]
- **2026 edition.** "Deeper Focus: Remastered and Reduced" (21 May 2026, App Store v4.8.3) added a tuning slider "from the signature techno to softer ambient sound". The press dispatch claims more than 5 million hours played and a place in Endel's top five soundscapes. Sources: [App Store](https://apps.apple.com/us/app/endel-focus-sleep-sounds/id1346247457), [dispatch](https://endel.rockpaperscissors.biz/dispatch/pu/29871). The current app version is 4.9.0 (1 Oct 2026). [F]
- **Engine architecture (patents).** US12248289B2 (Endel Sound GmbH, granted 11 Mar 2025) describes the structure as "soundscapes are comprised of phases, phases are comprised of sections, and sections are comprised of layers". Other details from the patent:
  - Phases last "minutes to hours".
  - Note-sequence files are "10-20 second duration", up to 40 notes, divided by intensity.
  - Layers must "not clash with each other in terms of tempo and intensity".
  - Note choice uses Markov timelines and "a small degree of randomization".
  - Intro phases have "fewer sound layers"; "the phase body is generally a recurring section"; a stationary user gets "focus-related sounds".
  - Related grants are US10948890B2 and US11275350B2, both titled "System and method for creating a personalized user environment". The phrase "circadian rhythms, pentatonic scale, and sound masking" comes from their description, not their titles.
  - Sources: [US12248289B2](https://patents.google.com/patent/US12248289B2/en), [US10948890B2](https://patents.google.com/patent/US10948890B2/en), [US11275350B2](https://patents.google.com/patent/US11275350B2/en). [F]
- **Binaural beats.** Endel's FAQ says only the Binaural Beats scenario uses them: "The other sounds don't use this technology" ([endel.io/focus](https://endel.io/focus)). Coloured noise is a separate soundscape with nine colours ([endel.io/soundscapes](https://endel.io/soundscapes)). Endel tunes to 440 Hz (FAQ). [F]
- **Public long-form sample.** A long public sample exists: "Plastikman x Endel: 24 hours of Deeper Focus" (2021 Beatport livestream), [YouTube Part 1](https://www.youtube.com/watch?v=mfqcgALDLLE). It is a 2021 render, probably without per-listener heart-rate input. Use it as a reference for analysis only: never sample it, redistribute it, or use it as source audio, and check YouTube's terms before downloading. [F]

### Marketing / interview claims (untested)
- **Endel's Focus design rules** (generic Focus, not stated for Deeper Focus) [M]:
  - Tempo is "closely tied to your heart rate".
  - Sounds are "more active, have less reverb, and are more nuanced" ([Endel blog](https://endel.io/blog/the-science-behind-focus)).
  - "the brain starts to block out rhythmic sounds after a time", so rhythm needs "a very gentle balance".
  - Focus is the only Endel mode with percussion (Amazon Science narrator).
  - Evgrafov: "it's the nature of change that provides the most impact".
  - Stavitsky ([.ART, Mar 2026](https://oldwebsite.art.art/blog/in-the-flow-of-sound)): changes "ideally below conscious notice"; "steady beats at certain BPM ranges"; no "choruses or dramatic sections".
- **Heart-rate sync.** MusicTech reports Deeper Focus syncs "BPM to BPM" with heart rate. Neither the mapping nor the default tempo without a watch is public. [M]
- **The 60–170 BPM range is not an engine-wide or Focus figure.** It comes from a Feb 2022 post about the Move/"Clarity Trip" walking and running soundscapes ([blog](https://endel.io/blog/dmitry-evgrafov-our-world-in-motion)). [F, correction]
- **Pentatonic.** Stavitsky says "All soundscapes are based on the pentatonic scale" ([Ness Labs](https://nesslabs.com/?p=11806)), while Amazon Science says Endel "first used" pentatonic ([link](https://www.amazon.science/latest-news/the-science-behind-endels-ai-powered-soundscapes)). Hawtin's stems were original material, and nothing confirms the pentatonic rule applied to them. [M / ?]
- **Efficacy figures.** "7x", "×7" and "maintained for 95% of listening time" are not in the paper, which reports 87%. The "3.6x stress reduction" figure is footnoted to an unpublished Experience Sampling survey. Endel's science page cites Thaut et al. 2014 for "a regular beat helps concentration", but that paper is about the neural basis of rhythm perception and did not test concentration ([endel.io/science](https://endel.io/science)). [M, misapplied]
- **ADHD uptake.** Stavitsky: "many people with ADHD turned to this soundscape" (dispatch). Anecdotal. [M]

### Corrected or dropped
- **"Depth modes" (study/recovery/sleep).** Only mixing.co.kr presents these as in-app modes. First-party material treats them as use cases. Dropped as a feature. [?]
- **"Dynamic Focus" and "Tuning Pad".** Dynamic Focus is listed in the App Store description. "Tuning Pad" is unsupported. [F / ?]
- **EP4498357A1.** This patent covers soundtracks synced to reading a text (e-book or transcript frames). Linking it to the Nov 2025 Custom Scenarios text prompts is inference only ([EPO](https://data.epo.org/publication-server/rest/v1.2/patents/EP4498357NWA1/document.html)). [I]
- **User reports of crescendos, cymbal chimes and a "pentatonic piano line".** These come from the *Deep Work* and *Read* scenarios, not Deeper Focus. Excluded from the signature.
- **"7x = 17.5/2.5 time-to-effect" (Spotify's significance window starts at 17.5 min).** The arithmetic fits exactly, but Endel has never said how it got the number. [I, unverifiable]

### Unknown
BPM; tempo behaviour with and without a watch; key or pitch content; layer count; section length; whether any AM, noise bed or binaural content is present; what the 2026 slider changes acoustically; whether audio is synthesised on the device or streamed or cached. The Endel help article (endel.zendesk.com/hc/en-us/articles/360021064480) returns 403. No Reddit or App Store user descriptions specific to Deeper Focus were found.

---

## The focus signature — candidate properties

"Evidence strength" rates evidence that the property drives focus, not evidence that Deeper Focus has it. Nothing in this table is confirmed acoustically for Deeper Focus; the recording will settle that.

| # | Property | Why it might drive focus | Evidence strength | Target range / how to measure | Source |
|---|---|---|---|---|---|
| 1 | **Steady, predictable pulse** (fixed tempo, at most slow drift) | Regular structure is low-surprise. Endel says a "regular beat" underpins Focus. Fast and loud music hurt reading while 110 bpm at either level did not (n=25). | Low–moderate: marketing plus one small study [M][R] | Unknown for Deeper Focus. Measure the tempo track over the full take, with BPM mean and SD per 30 s window. Hypothesis: about 100–130 bpm feel (techno), stable within ±1 bpm. | [Endel blog](https://endel.io/blog/the-science-behind-focus); [Thompson 2012](https://sites.utm.utoronto.ca/sites/sites.utm.utoronto.ca.glenn_website/files/download/ThompsonEtAl2012.pdf) |
| 2 | **Sparseness / negative space** (few concurrent layers, deliberate silence) | Fewer events per unit time consume less attention. Hawtin uses "silence and the absence of sound". | Low: marketing plus general capacity argument [M][I] | Onsets per minute per band (<200 Hz / mid / >2 kHz); harmonic/percussive energy ratio; NMF-estimated active components over time; fraction of frames more than 20 dB below median. | [deeper.endel.io](https://deeper.endel.io/); [Thompson 2012](https://sites.utm.utoronto.ca/sites/sites.utm.utoronto.ca.glenn_website/files/download/ThompsonEtAl2012.pdf) |
| 3 | **Change below conscious notice** (slow LFO-driven timbre and filter drift inside stems) | Attention is captured by deviation from expectation, so slow drift avoids capture. Deviant capture and changing-state interference are separate mechanisms. | Moderate for avoiding abrupt change [R]; the "below notice" design itself is [M] | Spectral-centroid drift rate (Hz/min); envelope-modulation energy below 0.1 Hz; Foote novelty peaks per hour at 8/32/120 s kernels. Target: no novelty spikes above the take's own 95th percentile. | [Hughes et al. 2013](https://pure.royalholloway.ac.uk/en/publications/cognitive-control-of-auditory-distraction-impact-of-task-difficul/); [Attack](https://www.attackmagazine.com/features/interview/the-potential-of-ai-limitless-richie-hawtin/); [.ART](https://oldwebsite.art.art/blog/in-the-flow-of-sound) |
| 4 | **No deviants** (no one-off impacts, risers, sudden new timbres or level jumps; new elements arrive by crossfade) | Unexpected events cause MMN/P3a responses and slow performance. Predictable events capture less. | Strong in the lab [R] | Max short-term loudness step (dB per 3 s); count of onsets more than 10 dB above the local median; entry fade time of new layers (target: seconds). | [Schröger & Wolff 1998](https://pubmed.ncbi.nlm.nih.gov/9714745/); [Nöstl 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3492454/) |
| 5 | **Stable loudness** (low loudness range) | Loudness accounts for about two-thirds of salient events in natural scenes and is the single biggest salience lever. | Strong for salience [R] | EBU short-term LUFS SD and LRA (essentia/pyloudnorm). Hypothesis: LRA of a few LU. Match the engine to the recording. | [Huang & Elhilali 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC6909985) |
| 6 | **No vocals or speech-like content; few segmented pitch sequences in the ~2–8 Hz range** | Changing-state sound (distinct successive tokens) disrupts; speech is worst. A repeated identical token is "steady state" and harmless. Caveats: the effect is strongest for serial recall, attenuated for comprehension and absent for arithmetic, and the "~4 Hz worst" point rests on a coarse unpublished thesis (N=24, 5 rates). | Strong for serial recall, moderate as a generalisation to deep work [R] | Vocal/speech detector = 0. Distinct pitch events per minute (CQT peak tracking). Chroma-change rate. Note: repeated identical hats at 16ths are not changing-state; changing *pitches* at that rate would be. [I] | [Ellermeier & Zimmer 2014](https://www.jstage.jst.go.jp/article/ast/35/1/35_E141002/_article); [Kattner 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9569014) |
| 7 | **No song form** (no choruses, builds, drops or climax) | Avoids "this is music" engagement and tension-release arousal spikes. | Marketing only [M] | Self-similarity matrix: no long-range ABA structure; flat smoothed loudness across 10-min windows. | [.ART](https://oldwebsite.art.art/blog/in-the-flow-of-sound) |
| 8 | **Small, recurring vocabulary plus section-level reshuffles** | Habituation is likelier with repeated, simple material (ISE dropped after about 8 repetitions of the same sequence). Endel says the "nature of change" matters and that the brain tunes out rhythm. **Tension:** too static leads to habituation, too varied leads to capture. This is the key tuning axis. | Moderate for habituation [R]; "nature of change" is [M] | Recurrence lag peaks give loop lengths. Section length from 32/120 s Foote novelty. Count of distinct stems via 2–4 s chunk cross-correlation (near-1.0 peaks mean exact reuse). | [Röer et al. 2014](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:24203781%20AND%20SRC:MED&resultType=core&format=json); [Amazon Science](https://www.amazon.science/latest-news/how-endels-ai-powered-focus-soundscapes-earned-the-backing-of-neuroscience) |
| 9 | **Relatively dry mix** | Endel says Focus has "less reverb". Dry sound may keep the space forward and close. | Marketing only [M] | Decay-tail estimate after isolated transients (RT-like); direct-to-reverberant proxy; compare with Endel's ambient end of the slider. | [Endel blog](https://endel.io/blog/the-science-behind-focus) |
| 10 | **Consonant or minimal pitch content** (pentatonic/modal, drone-centred, or mostly unpitched) | Avoids dissonant clashes during random note choice. The major pentatonic has no semitones or tritones. | Design heuristic [F] for the scale, [M] for the Endel use | Chroma entropy; number of active pitch classes; essentia Key (`edma` vs `bgate`) plus key strength per 30 s; bass fundamental range. | [Pentatonic](https://en.wikipedia.org/wiki/Pentatonic_scale); [Ness Labs](https://nesslabs.com/?p=11806) |
| 11 | **Downward spectral tilt, low sharpness and roughness** | Psychoacoustic annoyance rises with sharpness and roughness. In Woods 2019, broadband AM interacting with sparse high-frequency events was "occasionally annoying (salient)". | Low–moderate [R][I] | LTAS tilt (dB/oct over 50 Hz–10 kHz) against pink (−3) and brown (−6.02). MoSQITo sharpness (acum) and roughness (asper) per 30 s at 48 kHz. | [Woods 2019](https://arxiv.org/pdf/1907.06909); [Zwicker annoyance summary](https://www.johndcook.com/blog/2016/07/28/quantifying-how-annoying-a-sound-is/) |
| 12 | **Beta-rate amplitude texture (12–20 Hz, ~16 Hz), band-limited (~200 Hz–1 kHz), beat-locked**: *presence in Deeper Focus unknown* | Beat-locked 16 Hz AM reduced SART errors in high-ASRS listeners and raised 16 Hz EEG phase-locking. Note that 32nd notes at 120 bpm put an envelope peak at exactly 16 Hz, so techno hats or textures may supply this without deliberate AM. | Moderate–weak: company-authored; the key effect is a three-way interaction at p=0.048; depth had no effect; a second correction (Apr 2026) is unexamined [R] | Per-band modulation spectrum: peak rate as a multiple of beat rate, modulation index per band, phase consistency against the beat grid. Imposed AM shows a narrow peak in a few bands; percussion shows broadband peaks at 2× or 4× the beat. | [Woods 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11499863/); [Woods 2019](https://arxiv.org/abs/1907.06909) |
| 13 | **Noise bed / masking floor**: *presence in Deeper Focus unknown* | ADHD: g=0.249 (13 studies, GRADE moderate). Non-ADHD: g≈−0.21. Brown noise has never been tested. The optimal level varies by person. | Moderate, and depends on the listener [R] | Noise-to-tonal ratio (spectral flatness or HPSS residual); level and tilt of the residual. Make it a user dial. | [Nigg 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11283987/) |
| 14 | **Reaches its working state within minutes, with a gentle ramp** | Endel's *generic* Focus beat silence from about 2.5 min (EEG decoder; working participants only). Brain.fm AM worked best "introduced gradually", and its benefit fell away after about 12 min. | Weak–moderate; not Deeper Focus; measures not comparable [R] | Engine: 1–3 min ramp to target, then drift every roughly 10–15 min. In the recording: how long until the full texture is present. | [Haruvi 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8829886/); [Woods 2019](https://arxiv.org/pdf/1907.06909) |
| 15 | **Moderate stereo width; bass near mono** | Wide stereo "can be too exciting" for work (myNoise heuristic). | Heuristic only [I] | Per-1/3-octave L/R correlation; side/mid ratio (dB); ILD time-series spectrum (0.05–1 Hz peaks indicate slow auto-pan). | [myNoise help](https://mynoise.net/NoiseMachines/help.php) |
| 16 | **Moderate playback level** | 45 dB white noise beat ambient on a CPT (n=39, weak stats). Fast music played loud hurt reading. Hearing-safety ceiling: 80 dB(A) for 40 h/week for adults. | Weak for the optimum [R]; ceiling [F] | Engine default near the masking level; user-adjustable; never routinely reaching the 75–85 dB used in lab ADHD studies. | [Awada 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9418159/); [WHO-ITU H.870](https://www.who.int/publications/i/item/9789241515276) |
| 17 | **Pulse-prominence macro (techno ↔ ambient)** | Endel's own 2026 control axis suggests percussion and pulse level is the main personal dial. People with ADHD report preferring more stimulating music (survey). | Marketing plus survey [M][R] | Record takes at the slider extremes and the midpoint; compare onset density, LUFS and HPSS ratio between them. | [App Store](https://apps.apple.com/us/app/endel-focus-sleep-sounds/id1346247457); [ADDitude on Lachance 2025](https://www.additudemag.com/background-music-amplitude-modulation-adhd-study/) |
| 18 | **Heart-rate-coupled tempo** (optional) | Endel claims beats sync to heart rate. It has never been tested as a mechanism, and Haruvi could not separate personalisation from content. | Untested [M] | Record with and without a watch connected; compare tempo tracks. | [MusicTech](https://musictech.com/news/richie-hawtin-plastikman-endel-create-ai-powered-soundscape-deeper-focus); [Haruvi 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8829886/) |

**Contradictions in the signature (they must be resolved by tuning, not assumed away):**
- **Pulse vs the 2–8 Hz "avoid" band.** Any 100–130 bpm groove with 16th-note subdivision puts events at 6.7–8.7 Hz. The ISE literature names *pitch/spectral token change* as the hazard, not repetition. So repeated identical percussion is probably safe, while melodic runs at that rate are not. [I]
- **Habituate vs refresh.** A small vocabulary helps habituation, but Endel says rhythm gets "blocked out" and Woods speculates that high-ASRS listeners need modulation to change over time. The section-change rate is the parameter to tune.
- **Noise and AM.** Both help people with attention difficulties and may slightly harm others. Defaults depend on the user.

---

## What the evidence does NOT support (so we don't build it)

- **Binaural beats as a core mechanism.** Pooled g≈0.40–0.45, but EEG entrainment fails in 8 of 14 studies, and a three-experiment test of 16 Hz beats found "rather strong evidence against" improved sustained attention. Endel says Deeper Focus doesn't use them. Sources: [Robison 2022](https://pubmed.ncbi.nlm.nih.gov/33978805/), [Ingendoh 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10198548/), [Garcia-Argibay 2019](https://pubmed.ncbi.nlm.nih.gov/30073406/). The "attention-only g≈0.58" figure could not be verified and is dropped.
- **Isochronic pulse trains.** They appear in only 2 of 17 quality-rated trials, and there is no attention evidence ([review](https://www.scielo.org.mx/pdf/rmn/v22n6/2604-6180-rmn-22-6-238.pdf)).
- **A 40 Hz "gamma" audio layer.** The positive study was audiovisual, had no audio-only arm, and did not report tone parameters ([Attokaren 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12407815/)). Apple Music Sound Therapy's "gamma waves" publish no method ([MacStories](https://www.macstories.net/news/hands-on-with-sound-therapy-on-apple-music/)).
- **AM at 32 Hz or faster.** It was worse than no modulation for high-ASRS listeners (preprint). Avoid it as a precaution, even though the evidence is limited ([Woods 2019](https://arxiv.org/pdf/1907.06909)).
- **Brown noise as superior.** It is untested in the meta-analysis. Choosing a colour is a comfort decision ([Nigg 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11283987/)).
- **"Neuroscience-backed frequencies", 432 Hz or Solfeggio.** None of these is ever specified, and Endel itself uses 440 Hz ([endel.io/focus](https://endel.io/focus)).
- **Headline multipliers** (Endel "7x", Brain.fm "up to 10x"). Neither appears in any published paper ([Brain.fm App Store](https://apps.apple.com/us/app/brain-fm-focus-music/id1110684238)).
- **Personalisation or biometrics as the cause.** No study has isolated it. Under-36s benefited from *all* audio, including the Spotify and Apple playlists, so for younger users "any steady audio vs silence" may explain a lot ([Haruvi 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8829886/)).
- **Copying lab noise levels (75–85 dB) for all-day use** ([WHO-ITU](https://www.who.int/publications/i/item/9789241515276)).
- **Heavy reverb or sleep-style washes in focus mode** (Endel's own rule [M]; generative.fm's 30 s / 60% wet reverb is a relax pattern).
- **Vocals, lyrics or speech textures, at any level** ([Ellermeier & Zimmer 2014](https://www.jstage.jst.go.jp/article/ast/35/1/35_E141002/_article); [Cheah 2022](https://livrepository.liverpool.ac.uk/3166444/)).
- **Modelling the engine on lo-fi or focus playlists.** In the only comparative EEG study, the playlists did not beat silence overall. Lo-fi itself has no concentration study.
- **Leaning on Voss & Clarke "1/f melodies are preferred" as evidence.** It is informal listening in a physics paper. Using 1/f drift is fine as a design choice, but it is not proven ([IBM abstract](https://research.ibm.com/publications/1f-noise-in-music-music-from-1f-noise)).
- **Reading Endel's science citations at face value.** Thaut 2014 is a rhythm-perception paper, and Lin 2022 studied preschoolers with ADHD ([endel.io/science](https://endel.io/science)).

---

## Landscape and design rules for a low-salience generative soundscape

### Landscape (what exists, and what is actually known)
- **Brain.fm.** Engineered music with beat-locked beta AM, an intensity dial with an "ADHD boost", timers, and offline play.
  - Evidence: Woods 2024 (company-authored, fragile p).
  - Patents: US11957467B2 (Woods and Clark). All its independent claims require a sensor-input value and a sensor-to-modulation mapping; explicit beat alignment appears only in dependent claim 10. US12406651B2 (Hewett, granted 2 Sep 2025) covers modulating selected cochlear bands, aligned to beats, mixed with unmodulated content. That sits very close to "16 Hz AM in 200 Hz–1 kHz".
  - Brain.fm's own blog misstates its study (it says "12–20 Hz", but only 8/16/32 Hz were tested).
  - Sources: [US11957467B2](https://patents.google.com/patent/US11957467B2/en), [US12406651B2](https://patents.google.com/patent/US12406651B2/en), [blog](https://www.brain.fm/blog/best-focus-music-app-brain-fm-vs-endel-vs-noisli).
- **Endel.** A generative, adaptive, stem-based engine (above). [Arctop](https://patents.google.com/patent/US12702345B2/en), which ran the study, holds US12702345B2 (granted 11 Aug 2026) on optimising audio features against EEG-predicted states. That patent matters only if an EEG closed loop is ever planned.
- **Focus@Will.** Curated channels at three energy levels. A consultant reports 128–132 bpm with small tempo switches to resist habituation [M] ([ADDitude](https://www.additudemag.com/music-for-adhd-focus/)).
- **myNoise.** A 10-band headphone-calibrated EQ with "Animate", which drifts each slider randomly between 50% and 125% of its set value (Soft = anywhere in range, Hard = to extremes). It says narrow stereo is better for focus ([help](https://mynoise.net/NoiseMachines/help.php)). [F] **Noisli** is a static layer mixer; its feature claims are unverifiable (archive 403).
- **Headspace, Calm, Apple Sound Therapy.** Curated tracks, with no adaptive engine and no published method.
- **SGNL.fm and Lo-Fire (2026).** Marginal "never-repeating" generative apps with no stated mechanism ([SGNL](https://mwm.ai/apps/sgnlfm/6758341309)).
- **The gap [I]:** none of these products measures a specific soundscape's properties and tunes a personal engine to them.

### Design rules (each tagged with its basis)
1. **Loudness first.** Run a short-term-loudness limiter or smoother with a context window of about 8 s, and cap per-window jumps in loudness, centroid and harmonicity (a "salience limiter"). [R: Huang & Elhilali]
2. **New elements never arrive as events.** Fade them in over seconds, keep them in the established key and timbre family, and repeat them so they join the expected texture. No one-off samples, impacts or risers. [R: deviant literature]
3. **No changing-state foregrounds.** No vocals. Keep tonal events sparse (Eno-style, about one every 20–60 s per voice in the ambient pole), with slow attacks. Prefer sustained or gliding tones over runs. [R, with a serial-recall caveat]
4. **Every decision is probabilistic inside a bounded "envelope of possibilities"**, weighted toward consonance; rare stays rare. Eno: "a certain level of surprise… not big surprises" ([Eno 1996](https://inmotionmagazine.com/eno1.html)). [F as practice]
5. **Use incommensurate loop and process periods so the texture never lines up** (Music for Airports: 23.5 / 25.875 / 29.9375 s). generative.fm's eno-machine draws each note's period once (20–60 s, MIT code), which shows the pattern works ([repo](https://github.com/generativefm/pieces-alex-bainter)). [F]
6. **Parameter drift via bounded smoothed random or 1/f processes**, LFOs below 0.1 Hz, with a slew-rate cap so no step is noticeable. myNoise's 0.5–1.25× bounded gain drift is a proven pattern. [I]
7. **Micro-movement inside layers, macro-structure from the arranger.** This mirrors Hawtin's "baked" LFOs plus Endel's phase/section/layer arranger: a tagged stem or voice pool (role, intensity tier, compatible partners), intro phases with fewer layers, and a recurring "phase body". [F as Endel's architecture, I as the recommendation]
8. **Section-level reshuffle every few minutes, by crossfade.** The rate is a tuned parameter (see contradiction 2 above). [M]
9. **Steady pulse; techno ↔ ambient macro.** Scale percussion level, onset density and transient sharpness together. [M]
10. **Dry-ish, moderately narrow, bass mono, downward tilt.** [M/I]
11. **Session arc:** 1–3 min ramp, a stable body with slow drift, a soft outro, no climax. [R weak / M]
12. **Never loop a short noise buffer.** Listeners implicitly learn repeated noise segments of about 4 s or less and keep them for weeks. Tone.js `Noise` is a ~5 s looped buffer ([Agus et al. 2010](https://pure.qub.ac.uk/en/publications/rapid-formation-of-robust-auditory-memories-insights-from-noise/); [Noise.ts](https://raw.githubusercontent.com/Tonejs/Tone.js/dev/Tone/source/Noise.ts)). Generate noise continuously in the DSP. [R/F]

---

## Engine stack recommendation (tuning tool now, app later)

### Now: personal tuning tool on Windows 11
- **Host.** A local web page (Vite dev server) in Chrome or Edge. No desktop shell is needed.
- **DSP.** Faust `.dsp` running as an AudioWorklet through **@grame/faustwasm 0.19.0** (1 Oct 2026). It recompiles in the browser, so DSP edits are audible in seconds, and it can render offline with `createOfflineProcessor` / `faust2sndfile`. Reverbs ship in the library (`zita_rev1_stereo` wrapping the 8×8 FDN `zita_rev_fdn`, `jpverb`, `dattorro_rev`). Sources: [faustwasm](https://github.com/grame-cncm/faustwasm), [reverbs.lib](https://faustlibraries.grame.fr/libs/reverbs/). [F]
- **Arranger** (phase/section/layer scheduler, probabilistic rule tables, 1/f drift bus, salience limiter). Keep all evolution inside the DSP or in AudioParam automation, never in main-thread `setTimeout`. Send parameters through AudioParams or a SharedArrayBuffer and smooth them in the DSP. Never allocate inside `process()`, because garbage collection runs on the worklet thread ([design pattern](https://developer.chrome.com/blog/audio-worklet-design-pattern), [profiling](https://web.dev/articles/profiling-web-audio-apps-in-chrome)). [F]
- **Context settings.** Use `latencyHint: 'playback'` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext)). Consider `renderSizeHint` of 256 (Chrome 153+; the only benchmark ran on macOS/M4, not Windows) ([blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/i4c1unRSmcE)). Start the context from a click ([autoplay](https://developer.chrome.com/blog/autoplay)).
- **Long-session constraints:**
  - **Stay above Chromium's silence threshold, about −72.25 dBFS**, including in quiet presets and fades. Below it the tab is no longer "audible", and once it has been silent for 30 s and hidden for 5 min, intensive throttling applies. Memory Saver also spares audible tabs only. Sources: [output_stream.cc](https://raw.githubusercontent.com/chromium/chromium/main/services/audio/output_stream.cc), [throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88), [Memory Saver](https://support.google.com/chrome/answer/12929150). [F]
  - Edge does not sleep tabs that are "playing audio" ([Microsoft Support](https://support.microsoft.com/en-us/edge/learn-about-performance-features-in-microsoft-edge)). [F]
  - Wrap phase accumulators and keep time in double precision. Guard against denormals (Faust `-ftz` exists; whether it applies to the WASM backend is unverified). Run an 8-hour soak test that logs underruns, using `playbackStats` if available (experimental) or `about://tracing`. [I/F]
- **Optional.** Use native Web Audio nodes for the first hour of prototyping. Tone.js 15.1.22 (stable) is fine for event and pad sequencing, but not for noise or core DSP.
- **Rejected for the core:** Csound-browser (7.0.0-beta), SuperSonic/scsynth (alpha, AGPL), glicol (stale since Apr 2024), Elementary (MIT and good, but slow cadence: core 4.0.1, Dec 2024), RNBO (paid toolchain; the under-$200k free-commercial licence term is unverified).

### Later: shippable app
- **Single source of truth:** the same Faust DSP, compiled per target. [I]
- **Desktop.**
  - Electron 44.7.0 with `backgroundThrottling: false` (the default is true).
  - Or Tauri 2.12. Its `backgroundThrottling` option is **unsupported on Windows**, so it relies on Chromium's audible exemption or the Web Locks workaround Tauri suggests. Test a minimised window for hours.
  - Sources: [Electron](https://www.electronjs.org/docs/latest/api/structures/web-preferences), [Tauri config](https://v2.tauri.app/reference/config/). [F]
- **Mobile: native host, not a PWA.**
  - iOS treats AudioContext as "ambient" and blocks it in the background unless `navigator.audioSession.type='playback'` is set. WebKit bug 291892 (AudioContext silent after a PWA returns from background) is still NEW, and a report says even `<audio>` went silent in iOS 26.0 PWAs. Sources: [bug 198277](https://bugs.webkit.org/show_bug.cgi?id=198277), [bug 291892](https://bugs.webkit.org/show_bug.cgi?id=291892). [F]
  - Host the Faust-generated C++ in AVAudioEngine/AVAudioSourceNode (iOS 13+) with the `audio` background mode ([Apple](https://developer.apple.com/documentation/avfaudio/avaudiosourcenode)), or in JUCE ≥ 9.0.4 (security fix; free Starter tier up to $20k revenue, otherwise AGPL) ([JUCE](https://github.com/juce-framework/JUCE/releases)).
  - Or use react-native-audio-api 0.13.6 (MIT; Web Audio-compatible; lock-screen controls) ([repo](https://github.com/software-mansion/react-native-audio-api)).
  - Android PWA background playback is unproven (the only evidence is a 2013 post). A native foreground service is the guaranteed path.
- **Lock-screen and media keys.** Chrome showed no media notification for Web Audio-only playback (2015 Android post; may be dated). Plan to route through a media element or use native Now Playing. Verify on each target.
- **Rust alternative:** fundsp 0.23.0 (noise colours, FDN `reverb_stereo`, `Wave::render`, `save_wav16`/`save_wav32`) with cpal 0.18.2 ([fundsp](https://github.com/SamiPerttu/fundsp)).
- **Freedom-to-operate (not legal advice).**
  - Endel: US10948890, US11275350 and US12248289 cover sensor-driven section selection plus learned preferences.
  - Brain.fm: US11957467 (claims require sensor-driven modulation) and US12406651 (beat-aligned band-selective modulation).
  - Arctop: US12702345 (EEG-optimised audio).
  - A personal tool is a different risk category from a product. Before any release, get counsel on beat-locked band-limited AM and on heart-rate-driven adaptation.

---

## How to measure the user's recording (capture steps + analysis recipe)

### Capture (Windows 11)
1. **Output device.** Use a wired or onboard output, or USB, set to **48 kHz stereo** in Sound → Advanced. Avoid Bluetooth: an app opening the mic forces hands-free (HFP) mono.
2. **Disable** audio enhancements, Loudness Equalization and Spatial sound (Sonic/Atmos), and any OEM layer such as MaxxAudio. Turn on Do Not Disturb. Set the Endel volume and Windows master to 100%, and turn the speakers down at the hardware. Where loopback sits relative to volume and the audio processing objects is undocumented, so calibrate (step 6). [I]
3. **Recorder, preferred.** Microsoft's ApplicationLoopback sample on the Endel process: `ApplicationLoopback <pid> includetree take.wav` (Win10 build 20348+). It excludes system sounds. If the wrong PID is chosen it records valid-looking silence, so check the level ([sample](https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/)). [F]
   **Alternatives:** Audacity (Host = Windows WASAPI, device "<output> (loopback)", 2 ch, 48 kHz, export 32-bit float WAV, Sound Activated Recording off) ([manual](https://manual.audacityteam.org/man/tutorial_recording_computer_playback_on_windows.html)), or PyAudioWPatch 0.2.12.9 (the same Python harness can then capture the engine through the identical path). Mainline FFmpeg has no WASAPI input. Loopback works in shared mode only, and exclusive-mode or DRM-protected streams give silence ([MS loopback](https://learn.microsoft.com/en-us/windows/win32/coreaudio/loopback-recording)). [F]
4. **Silence-gap guard.** WASAPI loopback delivers no data during silence, which can shorten a file without warning. Start Endel before recording, and check that the sample count matches wall-clock time ([NAudio](https://github.com/naudio/NAudio/blob/master/Docs/WasapiLoopbackCapture.md)). [F]
5. **Takes and log.** Record at least 3 takes of 30 min or more at different times of day. Include slider extremes and midpoint, and one take with heart rate connected and one without. Add **one multi-hour take** if long-timescale 1/f is wanted: 5×10⁻⁴ Hz is a ~33 min period, and Voss & Clarke used ~12 h averages. For each take, log the app version (4.9.0?), the edition ("Remastered and Reduced"), slider position, time, heart rate/location connected, and output device. Endel take-to-take spread becomes the tolerance floor.
6. **Calibration.** Play a −20 dBFS pink-noise WAV and a log sine sweep through the same path and record them. This gives path gain and frequency response. Divide them out of the LTAS. Treat Endel's absolute LUFS as approximate.
7. **Codec check.** A brick-wall spectrogram cutoff near 15–16 kHz or 19–20 kHz would suggest streamed or lossy audio. Whether Endel synthesises on the device is unknown. [I]

### Analysis recipe (Python; 30 s windows unless stated; report distributions, not single values)
| Measure | Tool / settings | Answers |
|---|---|---|
| Tempo and stability | librosa beat/tempogram per 30 s; BPM mean and SD; compare with and without heart rate | Property 1, 18 |
| Loudness | essentia `LoudnessEBUR128` (stereo, set `sampleRate`): short-term series, integrated LUFS, LRA; cross-check with pyloudnorm 0.2.0 ([essentia](https://essentia.upf.edu/reference/std_LoudnessEBUR128.html)) | 5, 16 |
| LTAS and tilt | `scipy.signal.welch` on mid, nperseg 32768 @ 48 kHz, Hann, 50% overlap. 1/3-octave levels. dB vs log2(f) slope over 50 Hz–10 kHz plus sub-ranges; centroid | 11 |
| Modulation spectrum (reference) | Ding et al. recipe: 128 log bands ~180 Hz–7.24 kHz; half-wave rectify; 8 ms single-pole LP; square; decimate to 100 Hz; 6 s DFT (no window); √f weighting; RMS across bands; normalise to max in 0.25–32 Hz (16 kHz resampling is the paper's *speech* setting) ([Ding](https://www.biorxiv.org/content/10.1101/059683v1.full)) | Music-like ~2 Hz vs speech-like ~5 Hz envelope |
| Modulation spectrum (wide-band, AM test) | Gammatone ~64 ERB bands 50 Hz–16 kHz (pyfar/Gammatone), envelope at 500 Hz, Welch 30 s. Per band: peak rate ÷ beat rate, modulation index m = 2\|E(fm)\|/E(0), phase consistency against the beat grid. Cross-check with a torch-amt `dau1997` modulation filterbank and soundgen `modulationSpectrum` (roughness, amMsFreq, amMsPurity) | 12 |
| Spectro-temporal MPS | 2D FFT of log-frequency spectrogram autocorrelation (64 bands, 10 ms hop, 10 s windows); compare engine vs Endel by correlating log-MPS (Singh & Theunissen 2003, JASA 114(6)) | Overall texture match |
| Onsets and flux | librosa `onset_strength` (sr 22050, hop 512, 128 mel; set `max_size` >1); onsets/min per band; `effects.hpss` energy ratio ([librosa](https://librosa.org/doc/0.11.0/generated/librosa.onset.onset_strength.html)) | 2, 4, 17 |
| Repetition and sections | Beat-synchronous chroma_cqt + MFCC → `stack_memory(n_steps=4)` → `recurrence_matrix(mode='affinity', sym=True, width>4 s)` → `recurrence_to_lag` (loop lengths); Foote novelty at 8/32/120 s kernels ([FMP](https://audiolabs-erlangen.de/resources/MIR/FMP/C4/C4S4_NoveltySegmentation.html)); 2–4 s chunk cross-correlation for exact stem reuse | 3, 7, 8 |
| Pitch content | chroma_cqt histogram, chroma entropy, number of active pitch classes, chroma-change rate; essentia `Key` with `edma` vs `bgate` plus strength ([Key](https://essentia.upf.edu/reference/std_Key.html)); CQT peak-track bass range and pitch-event rate | 6, 10 |
| Psychoacoustics | MoSQITo at 48 kHz (input in Pa, so apply the calibration factor): sharpness DIN 45692, roughness ECMA-418-2, tonality ECMA-418-1, loudness ISO 532-1 ([MoSQITo](https://mosqito.readthedocs.io/en/latest/source/reference/mosqito.sq_metrics.html)); 1–8 Hz modulation energy as a fluctuation-strength proxy | 11 |
| Stereo | Per-1/3-octave L/R correlation, S/M dB, ILD series spectrum [I: standard definitions, no citation] | 15 |
| Binaural check | Separate L/R FFTs (2^20 points, 20 s); paired tonal peaks below 1.5 kHz offset by 0.5–40 Hz and persistent; IPD rotating at Δf; envelope peak at Δf only in L+R. If nothing is found, drop binaural from the signature ([López-Caballero 2017](https://www.frontiersin.org/articles/10.3389/fnhum.2017.00557/full)) | Confirm absence |
| Long-timescale evolution | PSD of 0.1 s short-term loudness and centroid series; log-log slope over 0.001–1 Hz (−1 means 1/f, −2 means drift, 0 means stationary); needs multi-hour takes for the low end | 3, 8 |
| Noise bed | Spectral flatness / HPSS residual level and tilt | 13 |
| Dryness | Decay after isolated transients; direct-to-reverberant proxy | 9 |

### Engine-vs-recording validation [I: our design]
Loudness-match the engine to Endel's LUFS, then capture both through the identical loopback path. Compute the full feature vector per 30 s window. For each feature, compare distributions with Wasserstein distance or a KS test. The engine passes if it is no further from Endel than Endel takes are from each other. Add **FAD∞** on CLAP embeddings ([fadtk](https://pypi.org/project/fadtk/), `--inf`, `--indiv`; the score depends on the embedding chosen) ([paper](https://arxiv.org/abs/2311.01616)). Finish with a blind ABX listen and the user's own A/B focus sessions, because the perceived effect is the real target.

---

## Open questions only the user's ears or recording can answer

1. **Tempo.** What is it, does it move with heart rate, and what does it default to without a watch?
2. **Pitch content.** Is Deeper Focus pitched (pads, bass, pentatonic) or mostly unpitched texture?
3. **Fast amplitude texture.** Is there a 12–20 Hz peak? If so, is it deliberate band-limited AM or just 32nd-note percussion?
4. **Noise and binaural.** Is there a noise bed or masking floor? Any binaural pairs?
5. **Rate of change.** How often do elements enter or exit, and how long is a section? How many distinct stems are there, and when does the material audibly start repeating?
6. **The slider.** What does the 2026 techno ↔ ambient slider change: percussion level, layer count, filter, reverb, tempo?
7. **What the user's ears say is the active ingredient.** Pulse, sparseness, masking, or the "hypnotic" slow drift? A self-run A/B on the engine (beat on/off, noise on/off, change rate high/low, AM on/off) is the only way to isolate it for one person.
8. **Which slider position and which time of day** feel best? Does the effect build after about 2–5 min, and does it fade after about 15–20 min without change?
9. **Does the user have attention-difficulty traits (a high ASRS score)?** This sets the defaults for noise and AM.
10. **Task mix.** Is the user's deep work mostly reading or writing (most sensitive to changing-state sound) or coding or maths (less sensitive by the arithmetic data)?
11. **Distribution.** Is anything beyond a personal tool intended? That decides when the freedom-to-operate check is needed.
12. **Platform.** Is Endel playing on Windows (Store app or web) in shared mode? A 10 s test capture will confirm.

---

## Sources (grouped)

**Endel / Deeper Focus primary and press**
- https://endel.io/pages/newsroom/press-releases/plastikman/Endel-PressRelease-EndelxPlastikman.pdf
- https://deeper.endel.io/
- https://endel.io/focus · https://endel.io/science · https://endel.io/soundscapes · https://endel.io/technology · https://endel.io/adhd
- https://endel.io/blog/the-science-behind-focus
- https://endel.io/blog/dmitry-evgrafov-our-world-in-motion
- https://endel.rockpaperscissors.biz/dispatch/pu/29871
- https://apps.apple.com/us/app/endel-focus-sleep-sounds/id1346247457
- https://www.beatportal.com/articles/452112-we-talk-to-richie-hawtin-about-deeper-focus-his-collaborative-soundscape-with-endel-ai-to-get-you-focused
- https://www.attackmagazine.com/features/interview/the-potential-of-ai-limitless-richie-hawtin/
- https://musictech.com/news/richie-hawtin-plastikman-endel-create-ai-powered-soundscape-deeper-focus
- https://www.amazon.science/latest-news/how-endels-ai-powered-focus-soundscapes-earned-the-backing-of-neuroscience
- https://www.amazon.science/latest-news/the-science-behind-endels-ai-powered-soundscapes
- https://aboutamazon.com/news/devices/creating-a-new-world-of-personalized-music-through-ai
- https://oldwebsite.art.art/blog/in-the-flow-of-sound
- https://nesslabs.com/?p=11806
- https://ra.co/news/75188
- https://weraveyou.com/2026/05/endel-plastikman-deeper-focus-remastered-reduced/
- https://techcrunch.com/2022/05/20/endel-sony-partnership/
- https://juliandigital.com/blog/using-endel-for-three-months-here-are-my-impressions/
- https://www.youtube.com/watch?v=mfqcgALDLLE (reference only)

**Patents**
- Endel: https://patents.google.com/patent/US12248289B2/en · https://patents.google.com/patent/US10948890B2/en · https://patents.google.com/patent/US11275350B2/en · https://data.epo.org/publication-server/rest/v1.2/patents/EP4498357NWA1/document.html
- Brain.fm: https://patents.google.com/patent/US11957467B2/en · https://patents.google.com/patent/US11966661B2/en · https://patents.google.com/patent/US12406651B2/en · https://patents.google.com/patent/US12436729B2/en
- Arctop: https://patents.google.com/patent/US12702345B2/en

**Focus-audio studies**
- Haruvi et al. 2022 (Arctop/Endel): https://pmc.ncbi.nlm.nih.gov/articles/PMC8829886/ · https://www.frontiersin.org/journals/computational-neuroscience/articles/10.3389/fncom.2021.760561/full · https://www.biorxiv.org/content/10.1101/2021.04.02.438269v3.full
- Woods et al. 2024: https://pmc.ncbi.nlm.nih.gov/articles/PMC11499863/ (correction https://pmc.ncbi.nlm.nih.gov/articles/PMC12420781/) · Woods 2019 preprint: https://arxiv.org/abs/1907.06909
- Nigg et al. 2024 noise meta-analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC11283987/
- Söderlund / MBA: https://pubmed.ncbi.nlm.nih.gov/17683456/ · https://pmc.ncbi.nlm.nih.gov/articles/PMC2955636/ · Helps 2014: https://pmc.ncbi.nlm.nih.gov/articles/PMC4231104/
- Awada 2022: https://pmc.ncbi.nlm.nih.gov/articles/PMC9418159/
- Binaural: https://pubmed.ncbi.nlm.nih.gov/30073406/ · https://pubmed.ncbi.nlm.nih.gov/33978805/ · https://pmc.ncbi.nlm.nih.gov/articles/PMC10198548/ · https://www.frontiersin.org/articles/10.3389/fnhum.2017.00557/full
- Isochronic review: https://www.scielo.org.mx/pdf/rmn/v22n6/2604-6180-rmn-22-6-238.pdf · 40 Hz: https://pmc.ncbi.nlm.nih.gov/articles/PMC12407815/
- Brain.fm marketing: https://www.brain.fm/blog/beta-waves-brain-fm-engineering-focus · https://www.brain.fm/blog/best-focus-music-app-brain-fm-vs-endel-vs-noisli · https://apps.apple.com/us/app/brain-fm-focus-music/id1110684238

**Distraction, salience, habituation, music and cognition**
- Ellermeier & Zimmer 2014: https://www.jstage.jst.go.jp/article/ast/35/1/35_E141002/_article
- Kattner et al. 2022: https://pmc.ncbi.nlm.nih.gov/articles/PMC9569014
- Hughes et al. 2013: https://pure.royalholloway.ac.uk/en/publications/cognitive-control-of-auditory-distraction-impact-of-task-difficul/
- Schröger & Wolff 1998: https://pubmed.ncbi.nlm.nih.gov/9714745/ · Nöstl 2012: https://pmc.ncbi.nlm.nih.gov/articles/PMC3492454/
- Huang & Elhilali 2017: https://pmc.ncbi.nlm.nih.gov/articles/PMC6909985
- Röer et al. 2014 (abstract): https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:24203781%20AND%20SRC:MED&resultType=core&format=json · Röer 2017: https://pmc.ncbi.nlm.nih.gov/articles/PMC6645164/
- Ding et al. 2017: https://www.biorxiv.org/content/10.1101/059683v1.full
- Thompson et al. 2012: https://sites.utm.utoronto.ca/sites/sites.utm.utoronto.ca.glenn_website/files/download/ThompsonEtAl2012.pdf
- Cheah 2022: https://livrepository.liverpool.ac.uk/3166444/ · Gonzalez & Aiello 2019: https://www.Gwern.net/doc/music/music-distraction/2019-gonzalez.pdf · Kiss & Linnell 2021: https://research.gold.ac.uk/id/eprint/29238
- Agus et al. 2010: https://pure.qub.ac.uk/en/publications/rapid-formation-of-robust-auditory-memories-insights-from-noise/
- WHO-ITU H.870: https://www.who.int/publications/i/item/9789241515276
- Annoyance formula (secondary): https://www.johndcook.com/blog/2016/07/28/quantifying-how-annoying-a-sound-is/

**Generative practice and competitors**
- Eno 1996: https://inmotionmagazine.com/eno1.html · https://en.wikipedia.org/wiki/Ambient_1:_Music_for_Airports · https://factmag.com/2016/12/15/brian-eno-reflection-generative-music-app-endless
- generative.fm (MIT): https://github.com/generativefm/pieces-alex-bainter
- Voss & Clarke: https://research.ibm.com/publications/1f-noise-in-music-music-from-1f-noise · https://www.nature.com/articles/258317a0
- myNoise: https://mynoise.net/NoiseMachines/help.php · https://mynoise.net/faq.php
- Focus@Will: https://www.additudemag.com/music-for-adhd-focus/ · Sound Therapy: https://www.macstories.net/news/hands-on-with-sound-therapy-on-apple-music/ · SGNL: https://mwm.ai/apps/sgnlfm/6758341309

**Engine and platform**
- https://github.com/grame-cncm/faustwasm · https://www.npmjs.com/package/@grame/faustwasm · https://faustlibraries.grame.fr/libs/reverbs/ · https://faustdoc.grame.fr/manual/options/
- https://developer.chrome.com/blog/background_tabs · https://developer.chrome.com/blog/timer-throttling-in-chrome-88 · https://raw.githubusercontent.com/chromium/chromium/main/services/audio/output_stream.cc · https://support.google.com/chrome/answer/12929150 · https://support.microsoft.com/en-us/edge/learn-about-performance-features-in-microsoft-edge
- https://developer.chrome.com/blog/autoplay · https://developer.chrome.com/blog/audio-worklet-design-pattern · https://web.dev/articles/profiling-web-audio-apps-in-chrome · https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext · https://groups.google.com/a/chromium.org/g/blink-dev/c/i4c1unRSmcE · https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/playbackStats
- https://bugs.webkit.org/show_bug.cgi?id=198277 · https://bugs.webkit.org/show_bug.cgi?id=261554 · https://bugs.webkit.org/show_bug.cgi?id=291892 · https://developer.mozilla.org/en-US/docs/Web/API/Audio_Session_API
- https://www.electronjs.org/docs/latest/api/structures/web-preferences · https://v2.tauri.app/reference/config/
- https://raw.githubusercontent.com/Tonejs/Tone.js/dev/Tone/source/Noise.ts · https://github.com/elemaudio/elementary · https://rnbo.cycling74.com/learn/export-targets-overview
- https://github.com/juce-framework/JUCE/releases · https://github.com/SamiPerttu/fundsp · https://github.com/software-mansion/react-native-audio-api · https://developer.apple.com/documentation/avfaudio/avaudiosourcenode

**Measurement**
- https://learn.microsoft.com/en-us/windows/win32/coreaudio/loopback-recording · https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/ · https://manual.audacityteam.org/man/tutorial_recording_computer_playback_on_windows.html · https://github.com/naudio/NAudio/blob/master/Docs/WasapiLoopbackCapture.md · https://pypi.org/project/PyAudioWPatch/ · https://ffmpeg.org/ffmpeg-devices.html
- https://essentia.upf.edu/reference/std_LoudnessEBUR128.html · https://github.com/csteinmetz1/pyloudnorm · https://essentia.upf.edu/reference/std_Key.html
- https://librosa.org/doc/0.11.0/generated/librosa.onset.onset_strength.html · https://librosa.org/doc/0.11.0/generated/librosa.segment.recurrence_matrix.html · https://audiolabs-erlangen.de/resources/MIR/FMP/C4/C4S4_NoveltySegmentation.html
- https://mosqito.readthedocs.io/en/latest/source/reference/mosqito.sq_metrics.html · https://torch-amt.readthedocs.io/en/latest/api/modulation.html · https://pyfar.readthedocs.io/en/v0.5.1/modules/pyfar.dsp.filter.html · https://rdrr.io/github/tatters/soundgen/man/modulationSpectrum.html
- https://arxiv.org/abs/2311.01616 · https://pypi.org/project/fadtk/
- https://en.wikipedia.org/wiki/Pink_noise

**Unreachable or unverified during research:** endel.zendesk.com help article (403); Hongisto/Haapakangas STI thresholds; Kämpfe 2011 full text; Noisli features page (403); Pickens et al. 2019 noise meta-analysis (not checked); labs.sonicfield.org (dead). Several verification passes ran out of web-search budget, so contrary-evidence searches (Reddit user reports, WebView2 minimised behaviour, Android Doze) remain open.
