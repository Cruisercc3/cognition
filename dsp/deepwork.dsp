// deepwork.dsp — the cognition engine, v2 (superset program; every variation is a
// parameter document over this address space).
//
// Character target: the Deeper Focus family — minimal techno after Plastikman: a steady
// pulse, metallic ticks, a mostly single-note acid line under slow filter sweeps, dub
// chords into a tape delay, a dark drifting pad; negative space; change below notice.
// The v1 engine is frozen as firstlisten.dsp (the First Listen reference).
//
// Signal flow
//   layers (kick, sub, hats, ohat, clap, perc, acid, stab, pad+beta, noise+air)
//   + ambience, each variation's own place (rain, the sea, high light, glass, hum)
//   + the studies' beds (series, parts, veil)
//   -> kick-keyed duck on sub / acid / stab / pad / noise / hum / series / parts
//   -> space (room, ping-pong tape delay, M/S width with mono bass, headphone crossfeed)
//   -> bus glue (gentle compression) + tape saturation -> master level
//   -> guard: slow loudness reduction (cut only) + brightness cap (cut only)
//   -> lookahead limiter: ceiling = min(short-term loudness + crest, absolute ceiling)
//   -> sub-audible keep-alive tone
//
// Host contract: see cog.lib. Every host-settable value goes through the commit latch.
// Discrete values (patterns, masks, chord, octaves) use D(); continuous values use C().
// Internal motion (sweeps, walks) is seeded and bar-locked, so renders reproduce exactly.

declare name "deepwork";
declare version "2";

import("stdfaust.lib");
import("cog.lib");

//===================================================================================
// System
//===================================================================================

seed    = nentry("seed", 1, 0, 16777215, 1);
commit  = nentry("commit", 0, 0, 1.0e12, 1);
imm     = nentry("immediate", 0, 0, 1, 1);
rampSec = nentry("rampSec", 0, 0, 3600, 0.001);
bpm     = nentry("bpm", 120, 90, 140, 0.01);

// Tempo changes glide by at most 0.2 bpm per bar, so variations at different tempos
// blend without a felt jump.
clock = barClockGlide(bpm, 4, 0.2);
ph    = clock : (_, !);
ebpm  = clock : (!, _);
bt    = barTrig(ph);
bi    = barIndex(bt);
lt    = latchTrig(commit, bt, imm);
ls    = latchState(commit, bt, imm);

D(x) = latched(lt, x);
C(x) = ramped(lt, rampSec, x);

SR = ma.SR;
TWO_PI = 2.0 * ma.PI;
stepSec = 60.0 / ebpm / 4.0;   // one 16th note
barPos  = bi + ph;            // continuous position in bars (for bar-locked slow motion)

//===================================================================================
// Motion: slow seeded walks under every layer (scaled by one amount)
//===================================================================================

motion = C(hslider("h:motion/amount", 1, 0, 2, 0.001));

// Bounded slow random walk: a new random target every `sec`, approached by a one-pole.
walk(k, sec) = ((wnoise(seed, k) : ba.sAndH(ba.pulse(int(sec * SR)) | impulse)) : si.smooth(ba.tau2pole(sec * 0.5)));
// Two incommensurate periods (1/f-ish), range about [-1, 1].
drift2(k, s1, s2) = walk(k, s1) * 0.6 + walk(k + 1, s2) * 0.4;

//===================================================================================
// Groove: 16-step grid, swing on odd 16ths, per-hit humanising
//===================================================================================

swing    = C(hslider("h:groove/swing[unit:steps]", 0.08, 0, 0.4, 0.001));
humanize = C(hslider("h:groove/humanize[unit:ms]", 3, 0, 12, 0.1));

pos      = ph * 16.0;
oddStep  = int(pos) % 2;
stepIdx  = int(pos - swing * oddStep);
stepTrig = impulse | (stepIdx != stepIdx');

bit(mask, s) = (int(mask) >> int(s)) & 1;

// Uniform random in [0,1), held for the whole step; stream j is per use.
stepRand(j) = ((wnoise(seed, 100 + j) + 1.0) * 0.5) : ba.sAndH(stepTrig);

// One-sample hit on this step: pattern steps fire with `prob`, others with `ghost`.
hit(mask, prob, ghost, j) = stepTrig * select2(bit(mask, stepIdx), stepRand(j) < ghost, stepRand(j) < prob);
// 1 if the current step is a pattern step (accent), 0 if it is a ghost step.
onPattern(mask) = bit(mask, stepIdx) : ba.sAndH(stepTrig);
// Delay a hit by a random 0..humanize ms (held per step; never crosses into the next step).
late(j, trig) = trig : de.delay(1024, int(stepRand(j) * humanize * 0.001 * SR));
// Random per-step level cut of up to `db` (velocity variation).
vel(j, db) = db2lin(0.0 - db * stepRand(j));

// Samples since the last trigger, and whether a trigger ever happened.
tsince(trig) = (\(c).(select2(trig > 0, min(c + 1.0, 1.0e12), 0.0))) ~ _;
everTrig(trig) = ((+(trig)) ~ _) > 0;

// Linear attack, exponential decay; silent until the first trigger.
envAD(trig, att, dec) = everTrig(trig) * min(1.0, t / max(1.0, att * SR)) * exp(0.0 - max(0.0, t - att * SR) / max(1.0, dec * SR))
with { t = tsince(trig); };

// Phase accumulator that resets on trigger (consistent attacks).
phasorReset(trig, f) = (\(p).(select2(trig > 0, ma.frac(p + f / SR), 0.0))) ~ _;
// Free-running phase accumulator.
phasor(f) = (\(p).(ma.frac(p + f / SR))) ~ _;

pan(p, x) = x * cos((p + 1.0) * ma.PI / 4.0), x * sin((p + 1.0) * ma.PI / 4.0);
// The same pan law applied to a stereo pair (each side its own signal).
panPair(p, l, r) = l * cos((p + 1.0) * ma.PI / 4.0), r * sin((p + 1.0) * ma.PI / 4.0);
L(s) = s : (_, !);
R(s) = s : (!, _);

// Peak-normalised saturation: a peak of 1 stays 1, the body thickens as d rises.
drive(d, x) = ma.tanh(x * g) / ma.tanh(g) with { g = 1.0 + d * 5.0; };

//===================================================================================
// Layer gate: arrangement-owned fade (on), user mute/solo
//===================================================================================

kickSolo  = D(checkbox("h:kick/solo"));
subSolo   = D(checkbox("h:sub/solo"));
hatsSolo  = D(checkbox("h:hats/solo"));
ohatSolo  = D(checkbox("h:ohat/solo"));
clapSolo  = D(checkbox("h:clap/solo"));
percSolo  = D(checkbox("h:perc/solo"));
acidSolo  = D(checkbox("h:acid/solo"));
stabSolo  = D(checkbox("h:stab/solo"));
padSolo   = D(checkbox("h:pad/solo"));
noiseSolo = D(checkbox("h:noise/solo"));
rainSolo  = D(checkbox("h:rain/solo"));
seaSolo   = D(checkbox("h:sea/solo"));
glassSolo = D(checkbox("h:glass/solo"));
lightSolo = D(checkbox("h:light/solo"));
humSolo   = D(checkbox("h:hum/solo"));
seriesSolo = D(checkbox("h:series/solo"));
partsSolo  = D(checkbox("h:parts/solo"));
veilSolo   = D(checkbox("h:veil/solo"));
anySolo = max(max(max(max(max(kickSolo, subSolo), max(hatsSolo, ohatSolo)),
                      max(max(max(clapSolo, percSolo), max(acidSolo, stabSolo)), max(padSolo, noiseSolo))),
                  max(max(rainSolo, seaSolo), max(max(glassSolo, lightSolo), humSolo))),
              max(max(seriesSolo, partsSolo), veilSolo));

gate(on, mute, solo) = C(on) * C(1.0 - mute) * select2(anySolo > 0, 1.0, C(solo));

kickGate  = gate(hslider("h:kick/on", 1, 0, 1, 0.0001),  checkbox("h:kick/mute"),  kickSolo);
subGate   = gate(hslider("h:sub/on", 1, 0, 1, 0.0001),   checkbox("h:sub/mute"),   subSolo);
hatsGate  = gate(hslider("h:hats/on", 1, 0, 1, 0.0001),  checkbox("h:hats/mute"),  hatsSolo);
ohatGate  = gate(hslider("h:ohat/on", 1, 0, 1, 0.0001),  checkbox("h:ohat/mute"),  ohatSolo);
clapGate  = gate(hslider("h:clap/on", 1, 0, 1, 0.0001),  checkbox("h:clap/mute"),  clapSolo);
percGate  = gate(hslider("h:perc/on", 1, 0, 1, 0.0001),  checkbox("h:perc/mute"),  percSolo);
acidGate  = gate(hslider("h:acid/on", 1, 0, 1, 0.0001),  checkbox("h:acid/mute"),  acidSolo);
stabGate  = gate(hslider("h:stab/on", 1, 0, 1, 0.0001),  checkbox("h:stab/mute"),  stabSolo);
padGate   = gate(hslider("h:pad/on", 1, 0, 1, 0.0001),   checkbox("h:pad/mute"),   padSolo);
noiseGate = gate(hslider("h:noise/on", 1, 0, 1, 0.0001), checkbox("h:noise/mute"), noiseSolo);
// ambience layers are off unless a variation asks for them
rainGate  = gate(hslider("h:rain/on", 0, 0, 1, 0.0001),  checkbox("h:rain/mute"),  rainSolo);
seaGate   = gate(hslider("h:sea/on", 0, 0, 1, 0.0001),   checkbox("h:sea/mute"),   seaSolo);
glassGate = gate(hslider("h:glass/on", 0, 0, 1, 0.0001), checkbox("h:glass/mute"), glassSolo);
lightGate = gate(hslider("h:light/on", 0, 0, 1, 0.0001), checkbox("h:light/mute"), lightSolo);
humGate   = gate(hslider("h:hum/on", 0, 0, 1, 0.0001),   checkbox("h:hum/mute"),   humSolo);
// the studies' beds, likewise off unless asked for
seriesGate = gate(hslider("h:series/on", 0, 0, 1, 0.0001), checkbox("h:series/mute"), seriesSolo);
partsGate  = gate(hslider("h:parts/on", 0, 0, 1, 0.0001),  checkbox("h:parts/mute"),  partsSolo);
veilGate   = gate(hslider("h:veil/on", 0, 0, 1, 0.0001),   checkbox("h:veil/mute"),   veilSolo);

//===================================================================================
// Tonal centre
//===================================================================================

root  = D(nentry("h:tonal/root[unit:midi]", 41, 24, 72, 1));
chord = D(nentry("h:tonal/chord[style:menu{'min7':0;'min9':1;'sus':2;'fifths':3}]", 0, 0, 3, 1));

chordInterval(v) = ba.selectn(4, int(chord),
                     ba.selectn(4, v, 0, 3, 7, 10),
                     ba.selectn(4, v, 0, 3, 10, 14),
                     ba.selectn(4, v, 0, 5, 7, 12),
                     ba.selectn(4, v, 0, 7, 12, 19));

//===================================================================================
// Kick — sine body with a pitch drop, a short noise click, saturation for weight
//===================================================================================

kMask  = D(nentry("h:kick/mask", 4369, 0, 65535, 1));
kProb  = C(hslider("h:kick/prob", 1, 0, 1, 0.001));
kLevel = C(hslider("h:kick/level[unit:dB]", -6, -60, 0, 0.1));
kPitch = C(hslider("h:kick/pitch[unit:Hz]", 48, 30, 80, 0.1));
kDrop  = C(hslider("h:kick/drop[unit:x]", 3, 0, 8, 0.01));
kDropT = C(hslider("h:kick/dropTime[unit:s]", 0.03, 0.005, 0.12, 0.001));
kAtt   = C(hslider("h:kick/attack[unit:s]", 0.001, 0.0005, 0.02, 0.0001));
kDec   = C(hslider("h:kick/decay[unit:s]", 0.3, 0.05, 1.2, 0.001));
kClick = C(hslider("h:kick/click", 0.25, 0, 1, 0.001));
kDrive = C(hslider("h:kick/drive", 0.3, 0, 1, 0.001));
kTone  = C(hslider("h:kick/tone[unit:Hz]", 5000, 120, 16000, 1));

kHit  = hit(kMask, kProb, 0, 1);
kT    = tsince(kHit);
kFreq = kPitch * (1.0 + kDrop * exp(0.0 - kT / max(1.0, kDropT * SR)));
kBody = sin(TWO_PI * phasorReset(kHit, kFreq)) * envAD(kHit, kAtt, kDec);
kClk  = (wnoise(seed, 12) : fi.highpass(2, 1800) : fi.lowpass(1, 9000)) * envAD(kHit, 0.0001, 0.0035);
kick  = (kBody + kClk * kClick * 0.6) : drive(kDrive) : fi.lowpass(2, kTone) : *(db2lin(kLevel) * kickGate);

// Kick-keyed duck: the bass, acid, chords, pad and bed make room for each kick. `duckShape`
// blends the kick's own envelope into a smooth breath locked to the beat (lowest on the
// beat, fullest on the offbeat): the bed then swells and settles without an edge.
duckAmt   = C(hslider("h:space/duck", 0.3, 0, 0.8, 0.001));
duckRel   = C(hslider("h:space/duckRelease[unit:s]", 0.16, 0.04, 0.5, 0.001));
duckAtt   = C(hslider("h:space/duckAttack[unit:s]", 0.003, 0.001, 0.1, 0.0001));
duckShape = C(hslider("h:space/duckShape", 0, 0, 1, 0.001));
beatBreath = 0.5 + 0.5 * cos(TWO_PI * ma.frac(ph * 4.0));   // 1 on each beat, 0 on the offbeat
duckEnv   = (envAD(kHit, duckAtt, duckRel) * (1.0 - duckShape) + beatBreath * duckShape) * kickGate;
duck      = 1.0 - duckAmt * duckEnv;

//===================================================================================
// Sub — mono, sparse notes on the tonal centre, slow filter, light drive
//===================================================================================

bMask   = D(nentry("h:sub/mask", 2056, 0, 65535, 1));
bProb   = C(hslider("h:sub/prob", 0.55, 0, 1, 0.001));
bGhost  = C(hslider("h:sub/ghost", 0.04, 0, 1, 0.001));
bLevel  = C(hslider("h:sub/level[unit:dB]", -8, -60, 0, 0.1));
bDec    = C(hslider("h:sub/decay[unit:s]", 0.22, 0.03, 1.5, 0.001));
bCut    = C(hslider("h:sub/cutoff[unit:Hz]", 220, 60, 1200, 1));
bMotion = C(hslider("h:sub/motion", 0.25, 0, 1, 0.001));
bGlide  = C(hslider("h:sub/glide[unit:s]", 0.02, 0.0, 0.3, 0.001));
bDrive  = C(hslider("h:sub/drive", 0.2, 0, 1, 0.001));
bOct    = D(nentry("h:sub/octave", -1, -2, 1, 1));
// `hold` keeps the note sounding between hits: a held bass that the duck makes breathe
bHold   = C(hslider("h:sub/hold", 0, 0, 1, 0.001));

bHit = hit(bMask, bProb, bGhost, 2);
// interval choice: root mostly; fifth / octave / minor seventh as motion rises
bR = stepRand(3);
bInterval = select2(bR < 1.0 - bMotion * 0.6, select2(bR < 1.0 - bMotion * 0.3, select2(bR < 1.0 - bMotion * 0.1, 10, 12), 7), 0);
bNote = (root + 12 * bOct + bInterval) : ba.sAndH(bHit);
bFreq = ba.midikey2hz(bNote) : si.smooth(ba.tau2pole(bGlide));
bPh   = phasor(bFreq);
sub   = (sin(TWO_PI * bPh) + 0.22 * sin(2.0 * TWO_PI * bPh)) * max(envAD(bHit, 0.006, bDec), bHold * everTrig(bHit))
        : drive(bDrive) : fi.lowpass(2, bCut) : *(db2lin(bLevel) * subGate * duck);

//===================================================================================
// Hats — 808-style metallic source (six square waves) blended with noise
//===================================================================================

hTune = C(hslider("h:hats/tune", 1, 0.5, 2, 0.001));
metal = (sq(205.3) + sq(304.4) + sq(369.6) + sq(522.7) + sq(540.0) + sq(800.0)) * (1.0 / 6.0)
with { sq(f) = os.square(f * hTune); };

hMask   = D(nentry("h:hats/mask", 21845, 0, 65535, 1));
hProb   = C(hslider("h:hats/prob", 0.92, 0, 1, 0.001));
hGhost  = C(hslider("h:hats/ghost", 0.12, 0, 1, 0.001));
hLevel  = C(hslider("h:hats/level[unit:dB]", -14, -60, 0, 0.1));
hHP     = C(hslider("h:hats/bright[unit:Hz]", 7500, 2000, 12000, 1));
hDec    = C(hslider("h:hats/decay[unit:s]", 0.035, 0.005, 0.2, 0.0005));
hAtt    = C(hslider("h:hats/attack[unit:s]", 0.0005, 0.0003, 0.01, 0.0001));
hMetal  = C(hslider("h:hats/metal", 0.6, 0, 1, 0.001));
hVel    = C(hslider("h:hats/velocity[unit:dB]", 3, 0, 12, 0.1));
hPan    = C(hslider("h:hats/pan", 0.12, -0.5, 0.5, 0.01));
hSpread = C(hslider("h:hats/spread", 0.1, 0, 0.5, 0.001));

hHit    = late(11, hit(hMask, hProb, hGhost, 4));
hAcc    = select2(onPattern(hMask), db2lin(-9.0), 1.0) * vel(12, hVel);
hDecM   = hDec * pow(2.0, 0.35 * motion * walk(44, 43.0));
// metal is shared; the noise part has its own stream per side (real stereo, not panning)
hSrc(k) = metal * hMetal + wnoise(seed, k) * (1.0 - hMetal) * 0.6;
hEnvG   = envAD(hHit, hAtt, hDecM) * hAcc * 40.0 * db2lin(hLevel) * hatsGate;
hCh(k)  = hSrc(k) : fi.highpass(2, hHP) : fi.highpass(2, hHP) : fi.lowpass(1, 15000) : *(hEnvG);
hPanHit = hPan + hSpread * (stepRand(13) * 2.0 - 1.0);
hatsS   = panPair(hPanHit, hCh(10), hCh(15));

//===================================================================================
// Open hat — the same metal, longer tail, usually on the offbeat
//===================================================================================

ohMask   = D(nentry("h:ohat/mask", 17476, 0, 65535, 1));
ohProb   = C(hslider("h:ohat/prob", 0.85, 0, 1, 0.001));
ohLevel  = C(hslider("h:ohat/level[unit:dB]", -20, -60, 0, 0.1));
ohBright = C(hslider("h:ohat/bright[unit:Hz]", 6500, 2000, 12000, 1));
ohDec    = C(hslider("h:ohat/decay[unit:s]", 0.22, 0.05, 0.8, 0.001));
ohPan    = C(hslider("h:ohat/pan", -0.1, -0.5, 0.5, 0.01));

ohHit = late(15, hit(ohMask, ohProb, 0, 14));
ohEnvG = envAD(ohHit, 0.002, ohDec) * vel(16, 2.0) * 17.0 * db2lin(ohLevel) * ohatGate;
ohCh(k) = (metal * 0.8 + wnoise(seed, k) * 0.35) : fi.highpass(2, ohBright) : fi.highpass(1, ohBright) : fi.lowpass(1, 14000) : *(ohEnvG);
ohatS  = panPair(ohPan, ohCh(13), ohCh(16));

//===================================================================================
// Clap — three fast noise bursts and a short tail, band-limited
//===================================================================================

cMask  = D(nentry("h:clap/mask", 4112, 0, 65535, 1));
cProb  = C(hslider("h:clap/prob", 1, 0, 1, 0.001));
cLevel = C(hslider("h:clap/level[unit:dB]", -18, -60, 0, 0.1));
cTone  = C(hslider("h:clap/tone[unit:Hz]", 1300, 500, 4000, 1));
cDec   = C(hslider("h:clap/decay[unit:s]", 0.14, 0.03, 0.6, 0.001));
cPan   = C(hslider("h:clap/pan", 0.05, -0.5, 0.5, 0.01));

cHit  = late(18, hit(cMask, cProb, 0, 17));
cT    = tsince(cHit);
cGap  = 0.009 * SR;
cBurst(i) = (cT >= i * cGap) * exp(0.0 - max(0.0, cT - i * cGap) / (0.0025 * SR));
cTail = (cT >= 2.0 * cGap) * exp(0.0 - max(0.0, cT - 2.0 * cGap) / max(1.0, cDec * SR));
cEnv  = everTrig(cHit) * ((cBurst(0) + cBurst(1) + cBurst(2)) * 0.6 + cTail * 0.8);
cCh(k) = wnoise(seed, k) : fi.highpass(2, cTone * 0.55) : fi.lowpass(2, cTone * 2.6) : *(cEnv * 12.0 * db2lin(cLevel) * clapGate);
clapS  = panPair(cPan, cCh(22), cCh(23));
clapM  = (cCh(22) + cCh(23)) * 0.5;

//===================================================================================
// Perc — rim / wood ping blended with a short low tom
//===================================================================================

pMask   = D(nentry("h:perc/mask", 8320, 0, 65535, 1));
pProb   = C(hslider("h:perc/prob", 0.1, 0, 1, 0.001));
pLevel  = C(hslider("h:perc/level[unit:dB]", -14, -60, 0, 0.1));
pFreq   = C(hslider("h:perc/freq[unit:Hz]", 1100, 300, 4000, 1));
pQ      = C(hslider("h:perc/q", 12, 2, 40, 0.1));
pBody   = C(hslider("h:perc/body", 0, 0, 1, 0.001));
pPan    = C(hslider("h:perc/pan", -0.2, -0.5, 0.5, 0.01));
pSpread = C(hslider("h:perc/spread", 0.15, 0, 0.5, 0.001));

pHit  = late(19, hit(pMask, pProb, 0, 5));
pExc  = wnoise(seed, 11) * envAD(pHit, 0.0003, 0.004) * 3.5;
pPing = pExc <: fi.resonbp(pFreq, pQ, 1.0), fi.resonbp(pFreq * 1.48, pQ, 0.5) :> _;
pTomF = pFreq * 0.18 * (1.0 + 1.5 * exp(0.0 - tsince(pHit) / (0.02 * SR)));
pTom  = sin(TWO_PI * phasorReset(pHit, pTomF)) * envAD(pHit, 0.001, 0.18);
perc  = (pPing * (1.0 - pBody) * 10.0 + pTom * pBody * 0.8) * vel(20, 3.0) * db2lin(pLevel) * percGate;
pPanHit = pPan + pSpread * (stepRand(21) * 2.0 - 1.0);

//===================================================================================
// Acid — a 303-style line: mostly one note, slides and accents, a resonant ladder
// filter under a slow bar-locked sweep (timbre moves, pitch mostly does not)
//===================================================================================

aMask      = D(nentry("h:acid/mask", 19789, 0, 65535, 1));
aProb      = C(hslider("h:acid/prob", 0.9, 0, 1, 0.001));
aGhost     = C(hslider("h:acid/ghost", 0.05, 0, 1, 0.001));
aLevel     = C(hslider("h:acid/level[unit:dB]", -16, -60, 0, 0.1));
aOct       = D(nentry("h:acid/octave", 0, -1, 2, 1));
aMotion    = C(hslider("h:acid/motion", 0.15, 0, 1, 0.001));
aSlide     = C(hslider("h:acid/slide", 0.2, 0, 1, 0.001));
aAccent    = C(hslider("h:acid/accent", 0.25, 0, 1, 0.001));
aWave      = C(hslider("h:acid/wave", 0, 0, 1, 0.001));
aCut       = C(hslider("h:acid/cutoff[unit:Hz]", 380, 60, 4000, 1));
aRes       = C(hslider("h:acid/res", 0.7, 0, 0.97, 0.001));
aEnvMod    = C(hslider("h:acid/envMod[unit:oct]", 2, 0, 5, 0.01));
aDec       = C(hslider("h:acid/decay[unit:s]", 0.2, 0.03, 1.5, 0.001));
aGateLen   = C(hslider("h:acid/gate", 0.55, 0.1, 1, 0.001));
aDrive     = C(hslider("h:acid/drive", 0.35, 0, 1, 0.001));
aSweep     = C(hslider("h:acid/sweep[unit:oct]", 1.2, 0, 3, 0.001));
aSweepBars = D(nentry("h:acid/sweepBars", 48, 4, 256, 1));
aSend      = C(hslider("h:acid/dubSend", 0.2, 0, 1, 0.001));
aPan       = C(hslider("h:acid/pan", 0, -0.5, 0.5, 0.01));

aHit  = hit(aMask, aProb, aGhost, 7);
aR    = stepRand(8);
aInterval = select2(aR < 1.0 - aMotion * 0.7, select2(aR < 1.0 - aMotion * 0.45, select2(aR < 1.0 - aMotion * 0.2, 10, 7), 12), 0);
aNote  = (root + 12 * aOct + aInterval) : ba.sAndH(aHit);
aSlOut = (stepRand(9) < aSlide) : ba.sAndH(aHit);   // this note ties into the next
aSlIn  = aSlOut' : ba.sAndH(aHit);                 // the previous note tied into this one
aAcc   = (stepRand(10) < aAccent) : ba.sAndH(aHit);
aFreq  = ba.midikey2hz(aNote) : si.smooth(select2(aSlIn, ba.tau2pole(0.001), ba.tau2pole(0.05)));
aEnvTrig = aHit * (1 - aSlIn);
aGateSig = everTrig(aHit) * (tsince(aHit) < select2(aSlOut, aGateLen, 1.05) * stepSec * SR);
aAmp   = aGateSig : si.smooth(ba.tau2pole(0.003));
aFEnv  = envAD(aEnvTrig, 0.0015, aDec * select2(aAcc, 1.0, 0.6));
aLfo   = 0.75 * sin(TWO_PI * barPos / max(1.0, aSweepBars)) + 0.25 * walk(40, 29.0);
aFc    = min(9000.0, aCut * pow(2.0, aEnvMod * aFEnv * select2(aAcc, 1.0, 1.5) + aSweep * motion * aLfo));
aNorm  = (log10(max(20.0, aFc) / 2.0) - 1.0) / 3.0;   // moogLadder's normalised frequency
aQ     = 0.707 + aRes * 18.0;
aOsc   = os.sawtooth(aFreq) * (1.0 - aWave) + os.square(aFreq) * aWave;
acid   = aOsc * (1.0 + aDrive) : ve.moogLadder(aNorm, aQ) : *(1.0 + aRes) : drive(aDrive)
         : *(aAmp * select2(aAcc, 1.0, 1.4) * 2.0 * db2lin(aLevel) * acidGate * duck);

//===================================================================================
// Dub stab — one chord in a fixed key, detuned and spread, a 4-pole filter envelope,
// into the ping-pong delay
//===================================================================================

sMask   = D(nentry("h:stab/mask", 1088, 0, 65535, 1));
sProb   = C(hslider("h:stab/prob", 0.08, 0, 1, 0.001));
sLevel  = C(hslider("h:stab/level[unit:dB]", -8, -60, 0, 0.1));
sCut    = C(hslider("h:stab/cutoff[unit:Hz]", 900, 150, 5000, 1));
sRes    = C(hslider("h:stab/res", 0.3, 0, 0.9, 0.001));
sEnvAmt = C(hslider("h:stab/envAmt", 1.5, 0, 6, 0.01));
sFDec   = C(hslider("h:stab/filterDecay[unit:s]", 0.12, 0.01, 1, 0.001));
sDec    = C(hslider("h:stab/decay[unit:s]", 0.25, 0.03, 2, 0.001));
sDet    = C(hslider("h:stab/detune[unit:cents]", 8, 0, 30, 0.1));
sOct    = D(nentry("h:stab/octave", 1, 0, 2, 1));
sSend   = C(hslider("h:stab/dubSend", 0.6, 0, 1, 0.001));

sHit    = hit(sMask, sProb, 0, 6);
sNote(v) = root + 12 * sOct + chordInterval(v);
sVoice(v, c) = os.sawtooth(ba.midikey2hz(sNote(v)) * pow(2.0, c / 1200.0));
sOscL   = (sVoice(0, sDet) + sVoice(1, 0.0 - sDet) + sVoice(2, sDet * 0.5) + sVoice(3, 0.0 - sDet * 0.7)) * 0.25;
sOscR   = (sVoice(0, 0.0 - sDet) + sVoice(1, sDet) + sVoice(2, 0.0 - sDet * 0.5) + sVoice(3, sDet * 0.7)) * 0.25;
sCutM   = sCut * pow(2.0, 0.5 * motion * walk(42, 41.0));
sFc     = min(10000.0, sCutM * (1.0 + sEnvAmt * envAD(sHit, 0.002, sFDec)));
sGain   = envAD(sHit, 0.003, sDec) * db2lin(sLevel) * stabGate * duck * 1.8;
stabL   = sOscL : ve.moog_vcf_2bn(sRes, sFc) : *(sGain) : betaChords;
stabR   = sOscR : ve.moog_vcf_2bn(sRes, sFc) : *(sGain) : betaChords;

//===================================================================================
// Pad / drone — detuned and spread, filter and level drifting below notice, with the
// optional beat-locked beta texture on its 200 Hz–1 kHz band
//===================================================================================

paLevel  = C(hslider("h:pad/level[unit:dB]", -20, -60, 0, 0.1));
paBright = C(hslider("h:pad/bright[unit:Hz]", 650, 150, 4000, 1));
paDrift  = C(hslider("h:pad/drift[unit:oct]", 0.6, 0, 2, 0.001));
paDetune = C(hslider("h:pad/detune[unit:cents]", 7, 0, 30, 0.1));
paShape  = C(hslider("h:pad/shape", 0.3, 0, 1, 0.001));
paBreath = C(hslider("h:pad/breath[unit:dB]", 1.5, 0, 6, 0.01));
paOct    = D(nentry("h:pad/octave", 1, 0, 2, 1));

paFc   = min(12000.0, paBright * pow(2.0, paDrift * motion * drift2(30, 37.0, 113.0)));
padNote(v) = root + 12 * paOct + ba.selectn(3, v, 0, 7, 10);
padOsc(f)  = os.sawtooth(f) * (1.0 - paShape) + os.triangle(f) * paShape * 1.3;
padVoice(v, d) = padOsc(ba.midikey2hz(padNote(v)) * pow(2.0, d / 1200.0));
padL = (padVoice(0, paDetune) + padVoice(0, 0.0 - paDetune * 0.4) + padVoice(1, 0.0 - paDetune) + padVoice(2, paDetune * 0.6)) * 0.55 : fi.lowpass(2, paFc);
padR = (padVoice(0, 0.0 - paDetune) + padVoice(0, paDetune * 0.4) + padVoice(1, paDetune) + padVoice(2, 0.0 - paDetune * 0.6)) * 0.55 : fi.lowpass(2, paFc);

// Beta texture: AM locked to the beat, 8 cycles per beat (4 if that would exceed 20 Hz).
amDepth = C(hslider("h:beta/depth", 0, 0, 0.5, 0.001));
amCyc   = select2(ebpm * 8.0 / 60.0 > 20.0, 8.0, 4.0);
amMod   = 1.0 - amDepth * (0.5 + 0.5 * cos(TWO_PI * ma.frac(ph * 4.0 * amCyc)));
betaAM(x) = x + (x : fi.bandpass(1, 200, 1000)) * (amMod - 1.0);
// `chords` carries the same texture onto the chord stabs (and their echoes)
amChords = C(hslider("h:beta/chords", 0, 0, 1, 0.001));
betaChords(x) = x + (x : fi.bandpass(1, 200, 1000)) * (amMod - 1.0) * amChords;

padGain = db2lin(paLevel + paBreath * motion * walk(32, 23.0)) * padGate * duck;
padOutL = padL : betaAM : *(padGain);
padOutR = padR : betaAM : *(padGain);

//===================================================================================
// Noise — continuous seeded bed (pink <-> brown) and a slowly sweeping band of air
//===================================================================================

nLevel  = C(hslider("h:noise/level[unit:dB]", -60, -80, -10, 0.1));
nColour = C(hslider("h:noise/colour", 0.5, 0, 1, 0.001));
nAir    = C(hslider("h:noise/air[unit:dB]", -80, -80, -20, 0.1));
nFollow = C(hslider("h:noise/airFollow", 0, 0, 1, 0.001));
nGust   = C(hslider("h:noise/gust", 0, 0, 1, 0.001));
nPump   = C(hslider("h:noise/pump", 0, 0, 1, 0.001));
nGain   = db2lin(nLevel) * noiseGate * duck;

pinkOf(x)  = x : no.pink_filter : *(2.3);
brownOf(x) = x : fi.pole(0.9985) : fi.highpass(1, 20) : *(0.075);
bed(k) = wnoise(seed, k) <: pinkOf, brownOf : (_ * (1.0 - nColour) + _ * nColour) : *(nGain);
// the air band drifts on its own; `airFollow` also ties it to the acid sweep (wind that
// moves with the line), `gust` lets it rise and fall in slow gusts
airCentre = 900.0 * pow(2.0, 1.4 * motion * drift2(46, 31.0, 71.0) + nFollow * aSweep * motion * aLfo);
airGust   = 1.0 + nGust * walk(296, 7.0);
// `pump` lets the air breathe with the beat too, as deep as asked: the breath of a groove
// that has no ticks in it
airPump   = 1.0 - nPump * duckEnv;
air(k) = wnoise(seed, k) : fi.resonbp(airCentre, 2.5, 1.0) : *(db2lin(nAir) * noiseGate * 2.0 * airGust) : *(airPump);
noiseL = bed(20) + air(26);
noiseR = bed(21) + air(27);

//===================================================================================
// Ambience — each variation's own place, under the music: rain, the sea, high light,
// distant glass, machine hum. Continuous textures or musical tones, never effects: nothing
// arrives as an event. All seeded; nothing loops.
//===================================================================================

u01(k) = (wnoise(seed, k) + 1.0) * 0.5;
// Sparse events from one stream: fires on average `rate` times a second; at a firing,
// u / p is again uniform in [0,1), so one stream also gives each event its own values.
fires(k, rate) = u01(k) < rate / SR;
drawAt(k, rate) = u01(k) / max(1.0e-12, rate / SR);
// Exponential decay, retriggered to `amp` (no exp per sample).
decay(trig, amp, sec) = (\(e).(select2(trig > 0, e * (1.0 - 1.0 / max(1.0, sec * SR)), amp))) ~ _;

// --- Rain, heard from indoors: thousands of small drops fused into one steady patter (a
//     steady-state sound: no single drop stands out), a soft wash, a low murmur on the roof
rnLevel = C(hslider("h:rain/level[unit:dB]", -30, -60, 0, 0.1));
rnDens  = C(hslider("h:rain/density[unit:/s]", 600, 50, 3000, 1));
rnTone  = C(hslider("h:rain/tone[unit:Hz]", 2500, 600, 8000, 1));
rnWash  = C(hslider("h:rain/wash[unit:dB]", -8, -40, 0, 0.1));

// rain thickens and thins over minutes, never suddenly
rnSwell = 1.0 + 0.3 * motion * walk(210, 47.0);
// each drop is one impulse, its size drawn at the firing (most are small), band-limited so
// it is a soft tap, never a click
patter(k) = (fires(k, rate) * v * v * select2(ma.frac(v * 13.0) < 0.5, 1.0, -1.0))
            : fi.highpass(2, rnTone * 0.4) : fi.lowpass(2, rnTone * 1.8) : *(4.0)
with { rate = rnDens * 0.5 * rnSwell; v = drawAt(k, rate); };
wash(k)  = wnoise(seed, k) : fi.highpass(1, 400) : fi.lowpass(2, rnTone * 1.4) : *(db2lin(rnWash) * 0.35);
murmur(k) = wnoise(seed, k) : fi.lowpass(2, 260) : *(db2lin(rnWash) * 1.3);
rainG   = db2lin(rnLevel) * rainGate * rnSwell;
rainL   = (patter(200) + wash(208) + murmur(212)) * rainG;
rainR   = (patter(220) + wash(209) + murmur(213)) * rainG;

// --- Sea: slow swells at a breathing pace over a distant wash. Each swell rises for two
//     fifths of its cycle and falls for three; the period wanders so waves never line up,
//     and each is its own size. One side hears the wave a moment before the other.
seLevel = C(hslider("h:sea/level[unit:dB]", -30, -60, 0, 0.1));
seRate  = C(hslider("h:sea/rate[unit:/min]", 5.5, 3, 10, 0.01));
seTone  = C(hslider("h:sea/tone[unit:Hz]", 900, 200, 4000, 1));
seWash  = C(hslider("h:sea/wash[unit:dB]", -14, -40, 0, 0.1));

sePh   = phasor(seRate / 60.0 * (1.0 + 0.12 * walk(300, 17.0)));
seWrap = (sePh < sePh') | impulse;
seSize = (0.55 + 0.45 * u01(302)) : ba.sAndH(seWrap) : si.smooth(ba.tau2pole(0.5));
seShape(x) = select2(x < 0.4, 0.5 + 0.5 * cos(ma.PI * (x - 0.4) / 0.6), 0.5 - 0.5 * cos(ma.PI * x / 0.4));
seSide(k, o) = body + foam
with {
  e    = seShape(ma.frac(sePh + o)) * seSize;
  n    = wnoise(seed, k);
  body = n : fi.lowpass(2, seTone * (0.25 + 0.75 * e)) : *(e * sqrt(e) * 1.6);
  f    = max(0.0, e - 0.55) * 2.2;                 // the foam: only near the crest
  foam = n : fi.highpass(2, 1500) : fi.lowpass(1, 6000) : *(f * f * 0.35);
};
seDist(k) = wnoise(seed, k) : fi.lowpass(2, 500) : *(db2lin(seWash) * 2.5 * (0.8 + 0.2 * walk(k + 1, 23.0)));
seaG = db2lin(seLevel) * seaGate;
seaL = (seSide(304, 0.0) + seDist(306)) * seaG;
seaR = (seSide(305, 0.05) + seDist(308)) * seaG;

// --- High light: open fifths on the root far above, each a pure tone swelling in and out on
//     its own slow clock, so the light is never the same twice and nothing ever starts
liLevel = C(hslider("h:light/level[unit:dB]", -30, -60, 0, 0.1));
liOct   = D(nentry("h:light/octave", 3, 2, 4, 1));
liSwell = C(hslider("h:light/swell[unit:s]", 9, 3, 30, 0.01));
liTone  = C(hslider("h:light/tone", 0.3, 0, 1, 0.001));

liVoice(v, k) = (os.osc(f) + os.osc(f * 2.0) * liTone * 0.35) * a * a
with {
  f = ba.midikey2hz(root + 12 * liOct + ba.selectn(4, v, 0, 7, 12, 19));   // open fifths: never a rub
  w = 0.5 + 0.5 * walk(k, liSwell * (0.8 + 0.12 * v));   // each note on its own clock
  a = 0.35 + 0.65 * w * w;
};
lightG = db2lin(liLevel) * lightGate * 0.5;
lightS = (pan(-0.6, liVoice(0, 320)), pan(0.2, liVoice(1, 322)), pan(-0.2, liVoice(2, 324)), pan(0.6, liVoice(3, 326)))
         :> (*(lightG), *(lightG));

// --- Glass: sparse, distant bell tones on chord notes, mostly heard in the room ------
glLevel = C(hslider("h:glass/level[unit:dB]", -30, -60, 0, 0.1));
glEvery = C(hslider("h:glass/every[unit:s]", 20, 3, 120, 0.1));
glDecay = C(hslider("h:glass/decay[unit:s]", 3, 0.3, 8, 0.01));
glTone  = C(hslider("h:glass/tone", 0.4, 0, 1, 0.001));
glOct   = D(nentry("h:glass/octave", 2, 1, 3, 1));
glSend  = C(hslider("h:glass/dubSend", 0.2, 0, 1, 0.001));

// on the 16th grid, on average one tone every `every` seconds; two voices take turns
glTrig  = stepTrig * (stepRand(30) < stepSec / max(1.0, glEvery));
glCount = (+(glTrig)) ~ _;
glT(pv) = glTrig * ((glCount % 2) == pv);
glU(pv, k) = u01(k) : ba.sAndH(glT(pv));
glBell(pv, k) = (os.osc(f) * dc(1.0)
                 + (os.osc(f * 2.0) * dc(0.6) * 0.5 + os.osc(f * 2.76) * dc(0.35) * 0.4 + os.osc(f * 5.4) * dc(0.15) * 0.25) * glTone)
                * min(1.0, tsince(t) / (0.012 * SR))
with {
  t     = glT(pv);
  u     = glU(pv, k);
  f     = ba.midikey2hz(root + 12 * glOct + chordInterval(int(u * 3.999)) + 12 * (ma.frac(u * 7.31) < 0.25));
  dc(d) = decay(t, 1.0, glDecay * d);
};
glPan(pv, k) = ma.frac(glU(pv, k) * 53.7) * 1.2 - 0.6;
glassG = db2lin(glLevel) * glassGate * 0.5;
glassS = (pan(glPan(1, 240), glBell(1, 240)), pan(glPan(0, 250), glBell(0, 250))) :> (*(glassG), *(glassG));
glassM = (L(glassS) + R(glassS)) * 0.5;

// --- Machine hum: the root's low harmonics with a slow wobble, and air-duct rush ------
huLevel = C(hslider("h:hum/level[unit:dB]", -34, -60, 0, 0.1));
huTone  = C(hslider("h:hum/tone[unit:Hz]", 400, 100, 2000, 1));
huRush  = C(hslider("h:hum/rush[unit:dB]", -12, -50, 0, 0.1));

huF = ba.midikey2hz(root - 12);
// harmonic n of the root an octave down (its fundamental sits under the sub), rolled
// off above `tone`
huH(n) = os.osc(huF * n) * (1.0 / n) / (1.0 + w * w) with { w = huF * n / huTone; };
humTone = (huH(2) + huH(3) * 0.8 + huH(4) + huH(5) * 0.6 + huH(6)) * (0.8 + 0.2 * walk(280, 13.0)) * 1.2;
rush(k) = wnoise(seed, k) : fi.bandpass(1, 250, 2500) : fi.lowpass(1, 900) : *(db2lin(huRush) * 2.0 * (0.7 + 0.3 * walk(k + 1, 19.0)));
humG = db2lin(huLevel) * humGate * duck;
humL = (humTone + rush(284)) * humG;
humR = (humTone * 0.9 + rush(286)) * humG;

//===================================================================================
// The studies' beds: three ways for the harmony to sit under the beat, each built for one
// of the Deep Work studies. Each is a continuous bed: nothing in them starts or stops.
//===================================================================================

// --- Series: one tone built from the harmonic series of the root — octaves, fifths and, if
//     asked, the natural seventh — at exact whole-number ratios, so nothing in it beats or
//     rubs and the ear hears one tone, not a chord. Each partial swells on its own slow clock:
//     the colour moves, the pitch never does.
srLevel = C(hslider("h:series/level[unit:dB]", -30, -60, 0, 0.1));
srOct   = D(nentry("h:series/octave", 0, -1, 1, 1));
// read directly (not ramped): the partials' clocks are then worked out once per block, and a
// change of bloom only changes how fast they wander, never the sound at that moment
srBloom = hslider("h:series/bloom[unit:s]", 14, 3, 60, 0.01);
srTilt  = C(hslider("h:series/tilt", 0.5, 0, 1, 0.001));
srSeven = C(hslider("h:series/seven", 0, 0, 1, 0.001));
srWidth = C(hslider("h:series/width", 0.4, 0, 1, 0.001));

// a sine read from a table: the beds run many oscillators, so they avoid per-sample sin()
sineTab(p) = rdtable(65536, sin(TWO_PI * float(ba.time) / 65536.0), int(p * 65536.0));
srF0 = ba.midikey2hz(root + 12 * srOct);
// partial n at weight wt, on its own clock k; the right ear hears it a little later in its
// cycle (width). The tilt blends two fixed roll-offs, so the weights cost no pow().
srPart(n, k, wt) = sineTab(p) * a, sineTab(ma.frac(p + srWidth * ma.frac(n * 0.618034))) * a
with {
  p = phasor(srF0 * n);
  w = 0.5 + 0.5 * walk(k, srBloom * (0.7 + 0.6 * ma.frac(n * 0.381966)));
  a = wt * (pow(n, -0.5) * (1.0 - srTilt) + pow(n, -1.5) * srTilt) * (0.2 + 0.8 * w * w);
};
seriesG = db2lin(srLevel) * seriesGate * duck * 0.6;
seriesS = (srPart(1, 400, 1.0), srPart(2, 402, 1.0), srPart(3, 404, 1.0), srPart(4, 406, 1.0),
           srPart(6, 408, 1.0), srPart(8, 410, 1.0), srPart(12, 412, 1.0), srPart(16, 414, 1.0),
           srPart(7, 418, srSeven))
          :> (*(seriesG), *(seriesG));

// --- Parts: a held four-part chord whose middle moves. The lowest and highest parts hold;
//     the two inner parts step to new notes one at a time, and each change is a slow
//     crossfade (no glide through the notes between, no gap). The ear tracks the top line
//     most closely, so the top stays still and the harmony moves inside.
ptLevel  = C(hslider("h:parts/level[unit:dB]", -30, -60, 0, 0.1));
ptBright = C(hslider("h:parts/bright[unit:Hz]", 900, 200, 4000, 1));
ptFade   = C(hslider("h:parts/fade[unit:s]", 6, 0.5, 30, 0.01));
ptDetune = C(hslider("h:parts/detune[unit:cents]", 4, 0, 20, 0.1));
ptOct    = D(nentry("h:parts/octave", 1, 0, 2, 1));
ptLow    = D(nentry("h:parts/low", 0, 0, 24, 1));      // semitones above the root
ptIn1    = D(nentry("h:parts/inner1", 3, 0, 24, 1));
ptIn2    = D(nentry("h:parts/inner2", 10, 0, 24, 1));
ptTop    = D(nentry("h:parts/top", 19, 0, 31, 1));

ptF0 = ba.midikey2hz(root + 12 * ptOct);
// the ratio of n semitones, from a table (one pow() for the whole chord, not one per part)
semis(n) = rdtable(32, pow(2.0, float(ba.time) / 12.0), int(n));
// One part holds its note; a new note crossfades in while the old one fades (a polynomial
// close to equal power). Two slots take turns, so the part never slides through the notes
// in between. Each part sits a few cents from true, its own way, so the chord is warm.
part(tgt, k, pn, d) = pan(pn, (slotA * ga + slotB * gb) * lev)
with {
  chg   = (tgt != tgt') * (1 - impulse);
  flip  = ((+(chg) ~ _) % 2) > 0.5;
  na    = tgt : ba.sAndH(1 - flip);
  nb    = tgt : ba.sAndH(flip);
  x     = flip : si.smooth(ba.tau2pole(ptFade * 0.3));
  ga    = (1.0 - x) * (1.0 + 0.82 * x);
  gb    = x * (1.0 + 0.82 * (1.0 - x));
  cents = 1.0 + ptDetune * d * 0.000577623;   // 2^(c/1200) to first order
  slotA = os.sawtooth(ptF0 * semis(na) * cents);
  slotB = os.sawtooth(ptF0 * semis(nb) * cents);
  lev   = 0.8 + 0.2 * walk(k, 17.0 + 3.0 * pn);
};
partsG = db2lin(ptLevel) * partsGate * duck * 0.5;
partsS = (part(ptLow, 440, -0.1, 0.3), part(ptIn1, 442, -0.5, -1.0), part(ptIn2, 444, 0.5, 1.0), part(ptTop, 446, 0.2, -0.6))
         :> (fi.lowpass(2, ptBright) : *(partsG)), (fi.lowpass(2, ptBright) : *(partsG));

// --- Veil: breath through tuned pipes. Noise through narrow bands on the chord's notes, from
//     the low middle up through the range where voices sit, each band breathing on its own
//     slow clock, over a soft steady body. It fills the band nearby speech occupies, so it
//     covers it, and it never changes fast enough to be heard as a change.
veLevel  = C(hslider("h:veil/level[unit:dB]", -30, -60, 0, 0.1));
veBody   = C(hslider("h:veil/body[unit:dB]", -12, -40, 0, 0.1));
veTilt   = C(hslider("h:veil/tilt", 0.5, 0, 1, 0.001));
veBreath = C(hslider("h:veil/breath", 0.25, 0, 0.6, 0.001));

// The minor chord's notes (root, third, fifth) from F3 up through F6, narrow enough to be
// heard as pitched breath rather than hiss; the body carries the veil on up through the
// range speech is understood by. The bands read the root control directly, so their tuning
// is worked out once per block rather than every sample (a change of root reaches them at
// once instead of on the bar line).
veRoot = nentry("h:tonal/root[unit:midi]", 41, 24, 72, 1);
veF(i) = ba.midikey2hz(veRoot + 12 + ba.selectn(8, i, 0, 7, 12, 15, 19, 24, 31, 36));
// each band breathes on its own clock, the same in both ears
veGain(i) = (1.0 - veTilt * 0.1 * i) * (1.0 + veBreath * walk(480 + i, 9.0 + i * 1.3));
// pink noise in, so every band carries the same power; `tilt` leans the chord darker
veSide(b) = sum(i, 8, src : fi.resonbp(veF(i), 16.0, 1.0) : *(veGain(i))) * 4.5 + body
with {
  src  = wnoise(seed, b + 15) : no.pink_filter;
  // the body is the part that covers speech: soft air across the band intelligibility lives in
  body = wnoise(seed, b + 16) : no.pink_filter : fi.highpass(2, 700) : fi.lowpass(2, 4500) : *(db2lin(veBody) * 60.0);
};
veilG = db2lin(veLevel) * veilGate;
veilL = veSide(480) * veilG;
veilR = veSide(520) * veilG;

//===================================================================================
// Space — room, ping-pong tape delay, M/S width (bass kept mono), crossfeed
//===================================================================================

roomWet   = C(hslider("h:space/room", 0.12, 0, 0.6, 0.001));
roomT60   = C(hslider("h:space/roomT60[unit:s]", 1.2, 0.2, 6, 0.01));
dubFb     = C(hslider("h:space/dubFeedback", 0.5, 0, 0.85, 0.001));
dubDiv    = D(nentry("h:space/dubDiv[unit:beats]", 0.75, 0.25, 2, 0.25));
dubLP     = C(hslider("h:space/dubTone[unit:Hz]", 2400, 400, 8000, 1));
dubMix    = C(hslider("h:space/dubMix", 0.4, 0, 1, 0.001));
width     = C(hslider("h:space/width", 1, 0, 1.2, 0.001));
crossfeed = C(hslider("h:space/crossfeed", 0.2, 0, 0.5, 0.001));

// a change of division glides like a tape machine (no click), over ~0.4 s
dubTime = min(60000.0, max(64.0, 60.0 / ebpm * dubDiv * SR)) : si.smooth(ba.tau2pole(0.4));
// tape wow and flutter
dubT    = dubTime * (1.0 + 0.0012 * sin(TWO_PI * phasor(0.31)) + 0.0005 * sin(TWO_PI * phasor(1.7)));
dubFbM  = min(0.85, max(0.0, dubFb + 0.06 * motion * walk(48, 59.0)));
fbx(s)  = s : fi.highpass(1, 160) : fi.lowpass(1, dubLP) : *(dubFbM) : ma.tanh;
// Ping-pong: each line's output feeds the other line, so echoes alternate L / R.
pingpong = (step ~ (_, _))
with {
  step(pL, pR, inL, inR) = ((inL + fbx(pR)) : de.fdelay(65536, dubT)),
                           ((inR + fbx(pL)) : de.fdelay(65536, dubT));
};

percS = pan(pPanHit, perc);
acidS = pan(aPan, acid);

dubIn = (stabL + stabR) * 0.5 * sSend + acid * aSend + perc * 0.12 + clapM * 0.08 + glassM * glSend;
dub   = (dubIn, 0.0) : pingpong;

// the ambience sits mostly in the room: glass is heard far off, rain on a wide surface
ambRoomL = rainL * 0.5 + L(glassS) * 1.6 + seaL * 0.25 + L(lightS) * 0.6;
ambRoomR = rainR * 0.5 + R(glassS) * 1.6 + seaR * 0.25 + R(lightS) * 0.6;
roomInL = L(hatsS) * 0.35 + L(ohatS) * 0.5 + L(clapS) * 0.9 + L(percS) * 0.7 + stabL * 0.5 + acid * 0.12 + padOutL * 0.35 + ambRoomL
          + L(seriesS) * 0.25 + L(partsS) * 0.35 + veilL * 0.3;
roomInR = R(hatsS) * 0.35 + R(ohatS) * 0.5 + R(clapS) * 0.9 + R(percS) * 0.7 + stabR * 0.5 + acid * 0.12 + padOutR * 0.35 + ambRoomR
          + R(seriesS) * 0.25 + R(partsS) * 0.35 + veilR * 0.3;
room    = (roomInL, roomInR) : re.zita_rev1_stereo(20, 200, 6000, roomT60, roomT60 * 0.8, 48000) : (*(roomWet), *(roomWet));

ambL = rainL + seaL + L(lightS) + L(glassS) * 0.5 + humL;
ambR = rainR + seaR + R(lightS) + R(glassS) * 0.5 + humR;
mixL = kick + sub + L(hatsS) + L(ohatS) + L(clapS) + L(percS) + L(acidS) + stabL + padOutL + noiseL + ambL + L(dub) * dubMix + L(room)
       + L(seriesS) + L(partsS) + veilL;
mixR = kick + sub + R(hatsS) + R(ohatS) + R(clapS) + R(percS) + R(acidS) + stabR + padOutR + noiseR + ambR + R(dub) * dubMix + R(room)
       + R(seriesS) + R(partsS) + veilR;

msWidth(l, r) = m + s, m - s
with { m = (l + r) * 0.5; s = ((l - r) * 0.5 : fi.highpass(2, 140)) * width; };
xfeed(l, r) = (l + cf(r)) / (1.0 + crossfeed), (r + cf(l)) / (1.0 + crossfeed)
with { cf(x) = x : fi.lowpass(1, 700) : de.delay(64, 14) : *(crossfeed); };

//===================================================================================
// Bus: glue compression + tape saturation
//===================================================================================

glue       = C(hslider("h:master/glue", 0.4, 0, 1, 0.001));
glueThresh = C(hslider("h:master/glueThreshold[unit:dB]", -12, -40, 0, 0.1));
tape       = C(hslider("h:master/drive", 0.15, 0, 1, 0.001));
tapeG      = 1.0 + tape * 1.5;
tapeSat(x) = ma.tanh(x * tapeG) / tapeG;
bus = co.compressor_stereo(1.0 + glue * 3.0, glueThresh, 0.015, 0.2) : (tapeSat, tapeSat);

//===================================================================================
// Master, guard, limiter, keep-alive
//===================================================================================

master    = C(hslider("h:master/level[unit:dB]", -12, -60, 0, 0.1));
ceilDb    = C(hslider("h:guard/ceiling[unit:dBFS]", -18, -60, -1, 0.1));
crestDb   = C(hslider("h:guard/crest[unit:dB]", 14, 6, 24, 0.1));
maxLoudDb = C(hslider("h:guard/maxLoudness[unit:dB]", -26, -60, -6, 0.1));
maxBright = C(hslider("h:guard/maxBrightness[unit:dB]", -14, -40, 0, 0.1));
floorDb   = C(hslider("h:keepalive/level[unit:dBFS]", -64, -90, -50, 0.1));
floorOn   = C(nentry("h:keepalive/on", 1, 0, 1, 1));

// K-weighting approximation and short-term mean square (~3 s window via one-pole).
kweight(x) = x : fi.highpass(1, 60) : fi.high_shelf(4.0, 1500.0);
msOf(l, r, tau) = ((kweight(l) ^ 2 + kweight(r) ^ 2) * 0.5) : si.smooth(ba.tau2pole(tau));
lin2db(x) = 10.0 * log10(max(x, 1.0e-12));     // for mean-square values
amp2db(x) = 20.0 * log10(max(x, 1.0e-9));

// Stage 1: slow loudness reduction + brightness cap (both cut only).
guardStage(l, r) = l2, r2
with {
  st   = lin2db(msOf(l, r, 1.5));
  grDb = min(0.0, maxLoudDb - st) : si.smooth(ba.tau2pole(2.0));
  g    = db2lin(grDb);
  hf   = (((l : fi.highpass(2, 4000)) ^ 2 + (r : fi.highpass(2, 4000)) ^ 2) * 0.5) : si.smooth(ba.tau2pole(1.5));
  ratio = lin2db(hf) - lin2db(msOf(l, r, 1.5) + 1.0e-12);
  cut  = min(0.0, maxBright - ratio) : max(-18.0) : si.smooth(ba.tau2pole(1.0));
  l2   = l * g : fi.high_shelf(cut, 4000.0);
  r2   = r * g : fi.high_shelf(cut, 4000.0);
};

// Stage 2: lookahead limiter, ceiling relative to short-term loudness and absolute.
LA = 256;
limiter(l, r) = attach((l @ LA) * g, st : hbargraph("h:meter/loudness[unit:dB]", -120, 0)),
                attach((r @ LA) * g, amp2db(g) : hbargraph("h:meter/gainReduction[unit:dB]", -60, 0))
with {
  st    = lin2db(msOf(l, r, 1.5));
  cdb   = min(max(st + crestDb, -50.0), ceilDb);
  peak  = max(abs(l), abs(r)) : ba.slidingMax(LA, LA);
  gt    = min(1.0, db2lin(cdb) / max(peak, 1.0e-9));
  gmin  = gt : ba.slidingMin(LA, LA);
  ac    = 1.0 - exp(-1.0 / (0.0015 * SR));
  rc    = 1.0 - exp(-1.0 / (0.25 * SR));
  g     = (\(prev).(select2(gmin < prev, prev + (gmin - prev) * rc, prev + (gmin - prev) * ac))) ~ _;
};

floorTone = sin(TWO_PI * phasor(18.0)) * db2lin(floorDb + 3.0103) * floorOn;

chain = (mixL, mixR) : msWidth : xfeed : bus : (*(db2lin(master)), *(db2lin(master)))
        : guardStage : limiter
        : (+(floorTone), +(floorTone));

process = chain : (attach(_, bi : hbargraph("bar", 0, 1.0e9)), attach(_, ls : hbargraph("latchedCommit", 0, 1.0e12)));
