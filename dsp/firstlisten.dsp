// firstlisten.dsp — FROZEN reference engine: the Deep Work engine exactly as heard at the
// First Listen (git tag first-listen, 2026-10-13). Never edit; the live engine is deepwork.dsp.
//
// Original header: the cognition engine (superset program; every style is a parameter
// document over this address space).
//
// Character target (by ear, against Plastikman: Deeper Focus): minimal techno —
// steady pulse, sparse and dry, deliberate negative space, drift below notice.
//
// Signal flow
//   layers (kick, sub, hats, perc, stab, pad+beta, noise bed)
//   -> space (short room, dub delay on stab/perc, M/S width, headphone crossfeed)
//   -> master level
//   -> guard: slow loudness reduction (cut only) + brightness cap (cut only)
//   -> lookahead limiter: ceiling = min(short-term loudness + crest, absolute ceiling)
//   -> sub-audible output floor (keeps Chromium treating the app as audible)
//
// Host contract: see cog.lib. Every host-settable value goes through the commit latch.
// Discrete values (patterns, masks, chord) use D(); continuous values use C().

declare name "firstlisten";
declare version "1";

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

ph   = barPhase(bpm, 4);
ebpm = barBpm(bpm, 4);
bt   = barTrig(ph);
bi   = barIndex(bt);
lt   = latchTrig(commit, bt, imm);
ls   = latchState(commit, bt, imm);

D(x) = latched(lt, x);
C(x) = ramped(lt, rampSec, x);

SR = ma.SR;
TWO_PI = 2.0 * ma.PI;

//===================================================================================
// Groove: 16-step grid with swing on odd 16ths
//===================================================================================

swing   = C(hslider("h:groove/swing[unit:steps]", 0.08, 0, 0.4, 0.001));
pos     = ph * 16.0;
oddStep = int(pos) % 2;
stepIdx = int(pos - swing * oddStep);
stepTrig = impulse | (stepIdx != stepIdx');

bit(mask, s) = (int(mask) >> int(s)) & 1;

// Uniform random in [0,1), held for the whole step; stream j is per layer.
stepRand(j) = ((wnoise(seed, 100 + j) + 1.0) * 0.5) : ba.sAndH(stepTrig);

// One-sample hit on this step: pattern steps fire with `prob`, others with `ghost`.
hit(mask, prob, ghost, j) = stepTrig * select2(bit(mask, stepIdx), stepRand(j) < ghost, stepRand(j) < prob);
// 1 if the current step is a pattern step (accent), 0 if it is a ghost step.
onPattern(mask) = bit(mask, stepIdx) : ba.sAndH(stepTrig);

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

//===================================================================================
// Layer gate: arrangement-owned fade (on), user mute/solo
//===================================================================================

// Each layer: on (arrangement fades), mute and solo (user). Solo of any layer
// silences the layers that are not soloed.
kickSolo  = D(checkbox("h:kick/solo"));
subSolo   = D(checkbox("h:sub/solo"));
hatsSolo  = D(checkbox("h:hats/solo"));
percSolo  = D(checkbox("h:perc/solo"));
stabSolo  = D(checkbox("h:stab/solo"));
padSolo   = D(checkbox("h:pad/solo"));
noiseSolo = D(checkbox("h:noise/solo"));
anySolo = max(max(max(kickSolo, subSolo), max(hatsSolo, percSolo)), max(max(stabSolo, padSolo), noiseSolo));

gate(on, mute, solo) = C(on) * C(1.0 - mute) * select2(anySolo > 0, 1.0, C(solo));

kickGate  = gate(hslider("h:kick/on", 1, 0, 1, 0.0001),  checkbox("h:kick/mute"),  kickSolo);
subGate   = gate(hslider("h:sub/on", 1, 0, 1, 0.0001),   checkbox("h:sub/mute"),   subSolo);
hatsGate  = gate(hslider("h:hats/on", 1, 0, 1, 0.0001),  checkbox("h:hats/mute"),  hatsSolo);
percGate  = gate(hslider("h:perc/on", 1, 0, 1, 0.0001),  checkbox("h:perc/mute"),  percSolo);
stabGate  = gate(hslider("h:stab/on", 1, 0, 1, 0.0001),  checkbox("h:stab/mute"),  stabSolo);
padGate   = gate(hslider("h:pad/on", 1, 0, 1, 0.0001),   checkbox("h:pad/mute"),   padSolo);
noiseGate = gate(hslider("h:noise/on", 1, 0, 1, 0.0001), checkbox("h:noise/mute"), noiseSolo);

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
// Kick — soft and round: sine with a short pitch drop, low-passed, no click
//===================================================================================

kMask  = D(nentry("h:kick/mask", 4369, 0, 65535, 1));
kProb  = C(hslider("h:kick/prob", 1, 0, 1, 0.001));
kLevel = C(hslider("h:kick/level[unit:dB]", -8, -60, 0, 0.1));
kPitch = C(hslider("h:kick/pitch[unit:Hz]", 45, 30, 80, 0.1));
kDrop  = C(hslider("h:kick/drop[unit:x]", 2.2, 0, 6, 0.01));
kDropT = C(hslider("h:kick/dropTime[unit:s]", 0.025, 0.005, 0.12, 0.001));
kAtt   = C(hslider("h:kick/attack[unit:s]", 0.002, 0.001, 0.02, 0.0001));
kDec   = C(hslider("h:kick/decay[unit:s]", 0.32, 0.05, 1.2, 0.001));
kTone  = C(hslider("h:kick/tone[unit:Hz]", 900, 120, 4000, 1));

kHit  = hit(kMask, kProb, 0, 1);
kT    = tsince(kHit);
kFreq = kPitch * (1.0 + kDrop * exp(0.0 - kT / max(1.0, kDropT * SR)));
kick  = sin(TWO_PI * phasorReset(kHit, kFreq)) * envAD(kHit, kAtt, kDec)
        : fi.lowpass(2, kTone) : *(db2lin(kLevel) * kickGate);

//===================================================================================
// Sub — mono, sparse offbeat or root notes, slow filter
//===================================================================================

bMask   = D(nentry("h:sub/mask", 2056, 0, 65535, 1));
bProb   = C(hslider("h:sub/prob", 0.55, 0, 1, 0.001));
bGhost  = C(hslider("h:sub/ghost", 0.04, 0, 1, 0.001));
bLevel  = C(hslider("h:sub/level[unit:dB]", -6, -60, 0, 0.1));
bDec    = C(hslider("h:sub/decay[unit:s]", 0.22, 0.03, 1.5, 0.001));
bCut    = C(hslider("h:sub/cutoff[unit:Hz]", 220, 60, 1200, 1));
bMotion = C(hslider("h:sub/motion", 0.25, 0, 1, 0.001));
bGlide  = C(hslider("h:sub/glide[unit:s]", 0.02, 0.0, 0.3, 0.001));
bOct    = D(nentry("h:sub/octave", -1, -2, 1, 1));

bHit = hit(bMask, bProb, bGhost, 2);
// interval choice: root mostly; fifth / octave / minor seventh as motion rises
bR = stepRand(3);
bInterval = select2(bR < 1.0 - bMotion * 0.6, select2(bR < 1.0 - bMotion * 0.3, select2(bR < 1.0 - bMotion * 0.1, 10, 12), 7), 0);
bNote = (root + 12 * bOct + bInterval) : ba.sAndH(bHit);
bFreq = ba.midikey2hz(bNote) : si.smooth(ba.tau2pole(bGlide));
bPh   = phasor(bFreq);
sub   = (sin(TWO_PI * bPh) + 0.22 * sin(2.0 * TWO_PI * bPh)) * envAD(bHit, 0.006, bDec)
        : fi.lowpass(2, bCut) : *(db2lin(bLevel) * subGate);

//===================================================================================
// Hats / ticks — identical filtered-noise micro-bursts (steady-state tokens)
//===================================================================================

hMask  = D(nentry("h:hats/mask", 17476, 0, 65535, 1));
hProb  = C(hslider("h:hats/prob", 0.92, 0, 1, 0.001));
hGhost = C(hslider("h:hats/ghost", 0.12, 0, 1, 0.001));
hLevel = C(hslider("h:hats/level[unit:dB]", -10, -60, 0, 0.1));
hHP    = C(hslider("h:hats/bright[unit:Hz]", 7000, 2000, 12000, 1));
hDec   = C(hslider("h:hats/decay[unit:s]", 0.03, 0.005, 0.2, 0.0005));
hAtt   = C(hslider("h:hats/attack[unit:s]", 0.0006, 0.0003, 0.01, 0.0001));
hPan   = C(hslider("h:hats/pan", 0.15, -0.5, 0.5, 0.01));

hHit   = hit(hMask, hProb, hGhost, 4);
hAcc   = select2(onPattern(hMask), db2lin(-9.0), 1.0);
hats   = wnoise(seed, 10) : fi.highpass(2, hHP) : fi.lowpass(1, min(18000.0, hHP * 2.2))
         : *(envAD(hHit, hAtt, hDec) * hAcc * 2.5 * db2lin(hLevel) * hatsGate);

//===================================================================================
// Sparse percussion — rim/wood ping, very rare, never accented
//===================================================================================

pMask  = D(nentry("h:perc/mask", 8320, 0, 65535, 1));
pProb  = C(hslider("h:perc/prob", 0.1, 0, 1, 0.001));
pLevel = C(hslider("h:perc/level[unit:dB]", -12, -60, 0, 0.1));
pFreq  = C(hslider("h:perc/freq[unit:Hz]", 1100, 300, 4000, 1));
pQ     = C(hslider("h:perc/q", 12, 2, 40, 0.1));
pPan   = C(hslider("h:perc/pan", -0.2, -0.5, 0.5, 0.01));

pHit   = hit(pMask, pProb, 0, 5);
pExc   = wnoise(seed, 11) * envAD(pHit, 0.0003, 0.004) * 3.5;
perc   = pExc <: fi.resonbp(pFreq, pQ, 1.0), fi.resonbp(pFreq * 1.48, pQ, 0.5) :> *(db2lin(pLevel) * percGate);

//===================================================================================
// Dub stab — one chord in a fixed key, filter envelope, into the dub delay
//===================================================================================

sMask   = D(nentry("h:stab/mask", 1088, 0, 65535, 1));
sProb   = C(hslider("h:stab/prob", 0.08, 0, 1, 0.001));
sLevel  = C(hslider("h:stab/level[unit:dB]", -6, -60, 0, 0.1));
sCut    = C(hslider("h:stab/cutoff[unit:Hz]", 900, 150, 5000, 1));
sEnvAmt = C(hslider("h:stab/envAmt", 1.5, 0, 6, 0.01));
sFDec   = C(hslider("h:stab/filterDecay[unit:s]", 0.12, 0.01, 1, 0.001));
sDec    = C(hslider("h:stab/decay[unit:s]", 0.25, 0.03, 2, 0.001));
sOct    = D(nentry("h:stab/octave", 1, 0, 2, 1));
sSend   = C(hslider("h:stab/dubSend", 0.6, 0, 1, 0.001));

sHit   = hit(sMask, sProb, 0, 6);
sVoice(v) = os.sawtooth(ba.midikey2hz(root + 12 * sOct + chordInterval(v)));
sOsc   = (sVoice(0) + sVoice(1) + sVoice(2) + sVoice(3)) * 0.25;
sFc    = min(16000.0, sCut * (1.0 + sEnvAmt * envAD(sHit, 0.002, sFDec)));
stab   = sOsc : fi.resonlp(sFc, 1.2, 1.0) : *(envAD(sHit, 0.003, sDec) * db2lin(sLevel) * stabGate);

//===================================================================================
// Pad / drone — sustained, slow filter and timbre drift (periods >= 30 s),
// with the optional beat-locked beta texture on its 200 Hz–1 kHz band
//===================================================================================

paLevel  = C(hslider("h:pad/level[unit:dB]", -20, -60, 0, 0.1));
paBright = C(hslider("h:pad/bright[unit:Hz]", 650, 150, 4000, 1));
paDrift  = C(hslider("h:pad/drift[unit:oct]", 0.6, 0, 2, 0.001));
paDetune = C(hslider("h:pad/detune[unit:cents]", 7, 0, 30, 0.1));
paOct    = D(nentry("h:pad/octave", 1, 0, 2, 1));

// Bounded slow random walk: a new random target every `sec`, approached by a one-pole.
walk(k, sec) = ((wnoise(seed, k) : ba.sAndH(ba.pulse(int(sec * SR)) | impulse)) : si.smooth(ba.tau2pole(sec * 0.5)));
// Two incommensurate periods (1/f-ish), range about [-1, 1].
drift = (walk(30, 37.0) * 0.6 + walk(31, 113.0) * 0.4);
paFc  = min(12000.0, paBright * pow(2.0, paDrift * drift));

padNote(v) = root + 12 * paOct + ba.selectn(3, v, 0, 7, 10);
padVoice(v, d) = os.sawtooth(ba.midikey2hz(padNote(v)) * pow(2.0, d / 1200.0));
padL = (padVoice(0, paDetune) + padVoice(1, 0.0 - paDetune) + 0.5 * padVoice(2, paDetune * 0.5)) * 0.33 : fi.lowpass(2, paFc);
padR = (padVoice(0, 0.0 - paDetune) + padVoice(1, paDetune) + 0.5 * padVoice(2, 0.0 - paDetune * 0.5)) * 0.33 : fi.lowpass(2, paFc);

// Beta texture: AM locked to the beat, 8 cycles per beat (4 if that would exceed 20 Hz).
amDepth = C(hslider("h:beta/depth", 0, 0, 0.5, 0.001));
amCyc   = select2(ebpm * 8.0 / 60.0 > 20.0, 8.0, 4.0);
amMod   = 1.0 - amDepth * (0.5 + 0.5 * cos(TWO_PI * ma.frac(ph * 4.0 * amCyc)));
betaAM(x) = x + (x : fi.bandpass(1, 200, 1000)) * (amMod - 1.0);

padGain = db2lin(paLevel) * padGate;
padOutL = padL : betaAM : *(padGain);
padOutR = padR : betaAM : *(padGain);

//===================================================================================
// Noise bed — continuous, seeded, decorrelated L/R; pink <-> brown (default off)
//===================================================================================

nLevel  = C(hslider("h:noise/level[unit:dB]", -40, -80, -10, 0.1));
nColour = C(hslider("h:noise/colour", 0.5, 0, 1, 0.001));
nGain   = db2lin(nLevel) * noiseGate;

pinkOf(x)  = x : no.pink_filter : *(2.3);
brownOf(x) = x : fi.pole(0.9985) : fi.highpass(1, 20) : *(0.075);
bed(k) = wnoise(seed, k) <: pinkOf, brownOf : (_ * (1.0 - nColour) + _ * nColour) : *(nGain);
noiseL = bed(20);
noiseR = bed(21);

//===================================================================================
// Space — short room, dub delay, M/S width, headphone crossfeed
//===================================================================================

roomWet   = C(hslider("h:space/room", 0.1, 0, 0.6, 0.001));
roomT60   = C(hslider("h:space/roomT60[unit:s]", 0.9, 0.2, 3, 0.01));
dubFb     = C(hslider("h:space/dubFeedback", 0.55, 0, 0.85, 0.001));
dubDiv    = D(nentry("h:space/dubDiv[unit:beats]", 0.75, 0.25, 2, 0.25));
dubLP     = C(hslider("h:space/dubTone[unit:Hz]", 2200, 400, 8000, 1));
dubMix    = C(hslider("h:space/dubMix", 0.35, 0, 1, 0.001));
width     = C(hslider("h:space/width", 0.8, 0, 1.2, 0.001));
crossfeed = C(hslider("h:space/crossfeed", 0.2, 0, 0.5, 0.001));

dubTime = min(60000.0, max(64.0, 60.0 / ebpm * dubDiv * SR));
dubLoop = (+ : de.sdelay(65536, 1024, dubTime)) ~ (fi.highpass(1, 150) : fi.lowpass(1, dubLP) : *(dubFb) : ma.tanh);
dubIn   = stab * sSend + perc * 0.15;
dubL    = dubIn : dubLoop;
dubR    = dubL : de.sdelay(32768, 1024, dubTime * 0.5);

roomIn  = hats * 0.5 + perc * 0.8 + stab * 0.6;
roomL_in = roomIn + padOutL * 0.4;
roomR_in = roomIn + padOutR * 0.4;
room    = (roomL_in, roomR_in) : re.zita_rev1_stereo(15, 200, 6000, roomT60, roomT60 * 0.8, 48000) : (*(roomWet), *(roomWet));

hatsS   = pan(hPan, hats);
percS   = pan(pPan, perc);

mixL = kick + sub + (hatsS : (_, !)) + (percS : (_, !)) + stab + padOutL + noiseL + dubL * dubMix + (room : (_, !));
mixR = kick + sub + (hatsS : (!, _)) + (percS : (!, _)) + stab + padOutR + noiseR + dubR * dubMix + (room : (!, _));

msWidth(l, r) = m + s, m - s with { m = (l + r) * 0.5; s = (l - r) * 0.5 * width; };
xfeed(l, r) = (l + cf(r)) / (1.0 + crossfeed), (r + cf(l)) / (1.0 + crossfeed)
with { cf(x) = x : fi.lowpass(1, 700) : de.delay(64, 14) : *(crossfeed); };

//===================================================================================
// Master, guard, limiter, floor
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

chain = (mixL, mixR) : msWidth : xfeed : (*(db2lin(master)), *(db2lin(master)))
        : guardStage : limiter
        : (+(floorTone), +(floorTone));

process = chain : (attach(_, bi : hbargraph("bar", 0, 1.0e9)), attach(_, ls : hbargraph("latchedCommit", 0, 1.0e12)));
