// field.dsp — the Field engine: the beatless and tonal worlds (Drift, Bloom, Lattice).
// Every Field style is a parameter document over this address space, so Auto can blend
// from one world into another.
//
// Where Pulse is drums over a bed in one dark key, Field opens the rest of the map:
//   Drift   — no beat: a chord bed whose voices change one at a time by crossfade, a root
//             drone, high harmonics swelling on their own clocks, pitched breath, a large
//             dark space. Nothing in it starts or stops.
//   Bloom   — soft struck tones on several loops of different lengths (after Eno's Music for
//             Airports), so their combination never repeats, over the bed.
//   Lattice — the pulse carried by tone: two lines play one short figure; the second slides
//             out of step and locks one step later (after Reich's phase pieces). No drums.
//
// Harmony is a mode on a root. The modes are ordered dark to bright (the colour ladder) and
// each rung differs from its neighbours by one note, so a shift of colour moves only the
// voices on that note, and they move by crossfade.
//
// Signal flow
//   bank (4 voices) + drone + glow + breath + bloom (6 loops) + lattice (2 lines)
//   -> space (large room, ping-pong delay, M/S width with mono bass, headphone crossfeed)
//   -> bus glue + tape saturation -> master level -> guard -> limiter -> keep-alive
//
// Host contract: see cog.lib. Discrete values use D(); continuous values use C().

declare name "field";
declare version "1";

import("stdfaust.lib");
import("cog.lib");
import("engine.lib");

//===================================================================================
// System
//===================================================================================

seed    = nentry("seed", 1, 0, 16777215, 1);
commit  = nentry("commit", 0, 0, 1.0e12, 1);
imm     = nentry("immediate", 0, 0, 1, 1);
rampSec = nentry("rampSec", 0, 0, 3600, 0.001);
bpm     = nentry("bpm", 60, 40, 140, 0.01);

clock = barClockGlide(bpm, 4, 0.2);
ph    = clock : (_, !);
bt    = barTrig(ph);
bi    = barIndex(bt);
lt    = latchTrig(commit, bt, imm);
ls    = latchState(commit, bt, imm);

D(x) = latched(lt, x);
C(x) = ramped(lt, rampSec, x);

SR = ma.SR;
barPos = bi + ph;             // continuous position in bars

motion = C(hslider("h:motion/amount", 1, 0, 2, 0.001));
W(k, sec) = walk(seed, k, sec);

//===================================================================================
// Element gate: arrangement-owned fade (on), user mute/solo
//===================================================================================

bankSolo    = D(checkbox("h:bank/solo"));
droneSolo   = D(checkbox("h:drone/solo"));
glowSolo    = D(checkbox("h:glow/solo"));
breathSolo  = D(checkbox("h:breath/solo"));
bloomSolo   = D(checkbox("h:bloom/solo"));
latticeSolo = D(checkbox("h:lattice/solo"));
phaseSolo   = D(checkbox("h:phase/solo"));
anySolo = max(max(max(bankSolo, droneSolo), max(glowSolo, breathSolo)), max(max(bloomSolo, latticeSolo), phaseSolo));

gate(on, mute, solo) = C(on) * C(1.0 - mute) * select2(anySolo > 0, 1.0, C(solo));

bankGate    = gate(hslider("h:bank/on", 1, 0, 1, 0.0001),    checkbox("h:bank/mute"),    bankSolo);
droneGate   = gate(hslider("h:drone/on", 1, 0, 1, 0.0001),   checkbox("h:drone/mute"),   droneSolo);
glowGate    = gate(hslider("h:glow/on", 0, 0, 1, 0.0001),    checkbox("h:glow/mute"),    glowSolo);
breathGate  = gate(hslider("h:breath/on", 0, 0, 1, 0.0001),  checkbox("h:breath/mute"),  breathSolo);
bloomGate   = gate(hslider("h:bloom/on", 0, 0, 1, 0.0001),   checkbox("h:bloom/mute"),   bloomSolo);
latticeGate = gate(hslider("h:lattice/on", 0, 0, 1, 0.0001), checkbox("h:lattice/mute"), latticeSolo);
phaseGate   = gate(hslider("h:phase/on", 0, 0, 1, 0.0001),   checkbox("h:phase/mute"),   phaseSolo);

//===================================================================================
// Harmony: a mode on a root, the colour ladder
//===================================================================================

root = D(nentry("h:tonal/root[unit:midi]", 38, 24, 60, 1));
mode = D(nentry("h:tonal/mode[style:menu{'phrygian':0;'aeolian':1;'dorian':2;'mixolydian':3;'ionian':4;'lydian':5}]", 2, 0, 5, 1));

// Semitones above the root of scale degree d (0..27, four octaves; 7 is the octave), one
// row per mode. The darkest mode, Phrygian, is the first row; each rung of the ladder raises
// one degree by a semitone: Aeolian the 2nd, Dorian the 6th, Mixolydian the 3rd, Ionian the
// 7th, Lydian the 4th. (A table, not arithmetic: worked out once, and quick to compile.)
ladder = waveform{
  0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19, 20, 22, 24, 25, 27, 29, 31, 32, 34, 36, 37, 39, 41, 43, 44, 46,
  0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24, 26, 27, 29, 31, 32, 34, 36, 38, 39, 41, 43, 44, 46,
  0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19, 21, 22, 24, 26, 27, 29, 31, 33, 34, 36, 38, 39, 41, 43, 45, 46,
  0, 2, 4, 5, 7, 9, 10, 12, 14, 16, 17, 19, 21, 22, 24, 26, 28, 29, 31, 33, 34, 36, 38, 40, 41, 43, 45, 46,
  0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28, 29, 31, 33, 35, 36, 38, 40, 41, 43, 45, 47,
  0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23, 24, 26, 28, 30, 31, 33, 35, 36, 38, 40, 42, 43, 45, 47
};
semisOf(d) = ladder, int(mode * 28 + max(0, min(27, d))) : rdtable;

//===================================================================================
// Bank — the bed: four held voices. Each holds its note; a new note crossfades in while the
// old fades (never a glide through the notes between). L and R hear the voice detuned
// opposite ways, which gives width without a chorus; a sine carries the body. All four
// swell on one shared breath, so they fuse into one bed.
//===================================================================================

bkLevel   = C(hslider("h:bank/level[unit:dB]", -20, -60, 0, 0.1));
bkBright  = C(hslider("h:bank/bright[unit:Hz]", 900, 150, 6000, 1));
bkDrift   = C(hslider("h:bank/drift[unit:oct]", 0.5, 0, 2, 0.001));
bkDetune  = C(hslider("h:bank/detune[unit:cents]", 4, 0, 20, 0.1));
bkSaw     = C(hslider("h:bank/saw", 0.5, 0, 1, 0.001));
bkSwell   = C(hslider("h:bank/swell", 0.2, 0, 0.6, 0.001));
bkBreathe = C(hslider("h:bank/breathe", 0, 0, 0.7, 0.001));
// read directly (not ramped): their clocks are worked out once per block
bkRate    = hslider("h:bank/breathRate[unit:/min]", 5.5, 2, 12, 0.01);
bkFade    = hslider("h:bank/fade[unit:s]", 8, 0.5, 40, 0.01);
bkOct     = D(nentry("h:bank/octave", 1, -1, 2, 1));
bkV1      = D(nentry("h:bank/v1", 0, 0, 27, 1));
bkV2      = D(nentry("h:bank/v2", 2, 0, 27, 1));
bkV3      = D(nentry("h:bank/v3", 4, 0, 27, 1));
bkV4      = D(nentry("h:bank/v4", 8, 0, 27, 1));

// The breath of the whole bed: rises for two fifths of its cycle and falls for three, at a
// breathing pace (`breathe` is its depth; 0 = still).
breathShape(x) = select2(x < 0.4, 0.5 + 0.5 * cos(ma.PI * (x - 0.4) / 0.6), 0.5 - 0.5 * cos(ma.PI * x / 0.4));
bkBreath = 1.0 - bkBreathe * (1.0 - breathShape(phasor(bkRate / 60.0)));

// One held voice: `key` is its MIDI note; two slots take turns.
heldVoice(key, k, pn, dd, fade, det, saw, swell) = panPair(pn, out(1.0), out(-1.0))
with {
  chg  = (key != key') * (1 - impulse);
  flip = ((+(chg) ~ _) % 2) > 0.5;
  fa   = midiHz(key : ba.sAndH(1 - flip));
  fb   = midiHz(key : ba.sAndH(flip));
  x    = flip : si.smooth(ba.tau2pole(fade * 0.3));
  ga   = (1.0 - x) * (1.0 + 0.82 * x);
  gb   = x * (1.0 + 0.82 * (1.0 - x));
  cents(s) = 1.0 + det * s * dd * 0.000577623;     // 2^(c/1200) to first order
  slot(f, s) = os.sawtooth(f * cents(s)) * saw + sineTab(phasor(f)) * (1.0 - saw) * 1.3;
  out(s) = (slot(fa, s) * ga + slot(fb, s) * gb) * lev;
  lev  = 1.0 + swell * W(k, 19.0 + 5.0 * pn);
};

bkKey(d) = root + 12 * bkOct + semisOf(d);
bkV(d, k, pn, dd) = heldVoice(bkKey(d), k, pn, dd, bkFade, bkDetune, bkSaw, bkSwell);
bkFc  = min(12000.0, bkBright * pow(2.0, bkDrift * motion * drift2(seed, 610, 41.0, 127.0)));
bankG = db2lin(bkLevel) * bankGate * bkBreath * 0.85;
bankS = (bkV(bkV1, 600, -0.45, 1.0), bkV(bkV2, 602, 0.35, -0.8), bkV(bkV3, 604, -0.25, 0.6), bkV(bkV4, 606, 0.55, -1.0))
        :> (fi.lowpass(2, bkFc) : *(bankG)), (fi.lowpass(2, bkFc) : *(bankG));

//===================================================================================
// Drone — the root, low and mono: its fundamental, octave and (if asked) fifth, breathing
// with the bed. A change of root crossfades like a bank voice.
//===================================================================================

drLevel = C(hslider("h:drone/level[unit:dB]", -22, -60, 0, 0.1));
drFifth = C(hslider("h:drone/fifth", 0.25, 0, 1, 0.001));
drOct   = D(nentry("h:drone/octave", -1, -2, 1, 1));

drKey  = root + 12 * drOct;
drChg  = (drKey != drKey') * (1 - impulse);
drFlip = ((+(drChg) ~ _) % 2) > 0.5;
drSlot(f) = sineTab(phasor(f)) + sineTab(phasor(f * 2.0)) * 0.35 + sineTab(phasor(f * 3.0)) * 0.18 * drFifth;
drX    = drFlip : si.smooth(ba.tau2pole(bkFade * 0.3));
droneM = (drSlot(midiHz(drKey : ba.sAndH(1 - drFlip))) * (1.0 - drX) + drSlot(midiHz(drKey : ba.sAndH(drFlip))) * drX)
         * (1.0 + 0.15 * W(630, 29.0)) * db2lin(drLevel) * droneGate * bkBreath * 1.4;

//===================================================================================
// Glow — the root's harmonic series far above (root, fifth, octave, twelfth: consonant in
// every mode), each partial swelling on its own slow clock and sitting in its own place.
// The colour moves; the pitch never does.
//===================================================================================

gwLevel = C(hslider("h:glow/level[unit:dB]", -34, -60, 0, 0.1));
gwOct   = D(nentry("h:glow/octave", 2, 1, 3, 1));
gwBloom = hslider("h:glow/bloom[unit:s]", 13, 3, 60, 0.01);

gwF0 = midiHz(root + 12 * gwOct);
gwPart(n, k, wt, pn) = panPair(pn, sineTab(p) * a, sineTab(ma.frac(p + 0.04)) * a)
with {
  p = phasor(gwF0 * n);
  w = 0.5 + 0.5 * W(k, gwBloom * (0.7 + 0.6 * ma.frac(n * 0.381966)));
  a = wt * w * w;
};
glowG = db2lin(gwLevel) * glowGate * 1.7;
glowS = (gwPart(1.0, 620, 1.0, -0.45), gwPart(1.5, 622, 0.7, 0.4), gwPart(2.0, 624, 0.55, -0.15), gwPart(3.0, 626, 0.35, 0.55))
        :> (*(glowG), *(glowG));

//===================================================================================
// Breath — air through narrow bands on the root's open intervals (root, fifth, octave,
// twelfth, two octaves) an octave up: pitched breath, never hiss. Each band breathes on its
// own clock. The bands read the root control directly, so their tuning is worked out once per
// block.
//===================================================================================

brLevel = C(hslider("h:breath/level[unit:dB]", -36, -60, 0, 0.1));
brQ     = hslider("h:breath/q", 18, 4, 40, 0.1);
brRoot  = nentry("h:tonal/root[unit:midi]", 38, 24, 60, 1);

brF(i) = ba.midikey2hz(brRoot + 12 + ba.selectn(5, i, 0, 7, 12, 19, 24));
brSide(b) = sum(i, 5, src : fi.resonbp(brF(i), brQ, 1.0) : *(1.0 - 0.12 * i) : *(1.0 + 0.6 * W(b + 2 + i, 11.0 + i * 1.7))) * 8.5
with { src = wnoise(seed, b) : no.pink_filter; };
breathG = db2lin(brLevel) * breathGate * bkBreath;
breathL = brSide(640) * breathG;
breathR = brSide(660) * breathG;

//===================================================================================
// Mallet — one struck tone: a soft felt tone (1:1 phase modulation whose brightness fades
// fast) blended with a tuned bar (partials at 1, 3.93 and 9.3, the upper ones dying first).
// The phase runs free and the envelope starts from where it is, so a voice struck again
// while it rings never clicks.
//===================================================================================

mallet(trig, hz, vel, dec, att, tone, bright) = (felt * (1.0 - tone) + bar * tone) * env
with {
  // the strike's corners rounded (2 ms), so its onset carries no click
  env  = envR(trig, vel, att, dec) : si.smooth(ba.tau2pole(0.002));
  idx  = decay(trig, 0.25 + 1.6 * bright, 0.18 + 0.06 * dec);
  pc   = phasor(hz);
  felt = sineTab(ma.frac(pc + 1.0 + idx * sineTab(pc) * 0.159155));
  h2   = decay(trig, 0.15 + 0.5 * bright, dec * 0.22);
  h3   = decay(trig, 0.05 + 0.25 * bright, dec * 0.07);
  bar  = sineTab(pc) + sineTab(phasor(hz * 3.93)) * h2 + sineTab(phasor(hz * 9.3)) * h3;
};

//===================================================================================
// Bloom — six loops of different lengths, each striking one tone. Their periods are
// pairwise incommensurate: every ratio between two of them sits at least 1.75% from any
// simple ratio up to fifths (1:2, 2:3, 3:4, 4:5, 3:5...), and each loop's rate also wanders
// by a few per cent, so the six never line up the same way twice. At each strike a loop keeps
// its tone, or (with chance `wander`) moves to a new one from the palette: the pentatonic of
// the mode, its chord tones, or the whole mode.
//===================================================================================

blLevel  = C(hslider("h:bloom/level[unit:dB]", -22, -60, 0, 0.1));
blEvery  = hslider("h:bloom/every[unit:s]", 16, 3, 90, 0.01);    // the shortest loop's period
blWander = C(hslider("h:bloom/wander", 0.35, 0, 1, 0.001));
blDecay  = C(hslider("h:bloom/decay[unit:s]", 4, 0.5, 12, 0.01));
blAttack = C(hslider("h:bloom/attack[unit:s]", 0.012, 0.003, 0.2, 0.0001));
blTone   = C(hslider("h:bloom/tone", 0.3, 0, 1, 0.001));
blBright = C(hslider("h:bloom/bright", 0.4, 0, 1, 0.001));
blSpace  = C(hslider("h:bloom/space", 0.6, 0, 1, 0.001));
blOct    = D(nentry("h:bloom/octave", 2, 0, 3, 1));
blSpan   = D(nentry("h:bloom/span", 8, 3, 14, 1));
blScale  = D(nentry("h:bloom/scale[style:menu{'pentatonic':0;'chord':1;'mode':2}]", 0, 0, 2, 1));
blVoices = D(nentry("h:bloom/voices", 6, 1, 6, 1));

// The i-th tone of the palette, as a scale degree (i = 0..14), one row per palette: the
// pentatonic of the mode (degrees 1 2 3 5 6), its seventh chord (1 3 5 7), the whole mode.
palettes = waveform{
  0, 1, 2, 4, 5, 7, 8, 9, 11, 12, 14, 15, 16, 18, 19,
  0, 2, 4, 6, 7, 9, 11, 13, 14, 16, 18, 20, 21, 23, 25,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14
};
palette(i) = palettes, int(blScale * 15 + max(0, min(14, i))) : rdtable;

blRatio(v)  = ba.selectn(6, v, 1.0, 1.1613, 1.3769, 1.6139, 1.7725, 1.8966);
blOffset(v) = ba.selectn(6, v, 0.83, 0.47, 0.21, 0.69, 0.07, 0.36);
blPan(v)    = ba.selectn(6, v, -0.5, 0.35, -0.2, 0.55, -0.4, 0.15);

bloomVoice(v) = pan(blPan(v), mallet(trig, midiHz(key), vel, blDecay, blAttack, blTone, blBright))
with {
  k    = 700 + v * 10;
  p    = ma.frac(phasor(1.0 / (blEvery * blRatio(v)) * (1.0 + 0.03 * motion * W(k, 31.0))) + blOffset(v));
  trig = (p < p') * (1 - impulse) * (v < blVoices);
  n    = (+(trig)) ~ _;
  move = trig * ((u01(seed, k + 1) < blWander) | (n <= 1));
  i    = int(u01(seed, k + 2) * blSpan) : ba.sAndH(move);
  key  = (root + 12 * blOct + semisOf(palette(i))) : ba.sAndH(trig);   // fixed for the whole strike
  vel  = (0.55 + 0.45 * u01(seed, k + 3)) : ba.sAndH(trig);
};

bloomG = db2lin(blLevel) * bloomGate * 1.4;
bloomS = (bloomVoice(0), bloomVoice(1), bloomVoice(2), bloomVoice(3), bloomVoice(4), bloomVoice(5)) :> (*(bloomG), *(bloomG));

//===================================================================================
// Lattice — two lines, one figure. The figure is twelve steps of scale degrees (or rests);
// the lattice line plays it on the beat grid, the phase line plays the same figure `lag`
// steps behind. When the arranger moves `lag` it ramps, so the phase line slides out of step
// and settles one step later: a new interlocking pattern from the same notes. Each line has
// two voices taking turns, so a note rings on while the next is struck.
//===================================================================================

ltLevel   = C(hslider("h:lattice/level[unit:dB]", -24, -60, 0, 0.1));
ltPattern = D(nentry("h:lattice/pattern", 0, 0, 3, 1));
ltRate    = D(nentry("h:lattice/rate[unit:/beat]", 2, 1, 4, 1));
ltLag     = C(hslider("h:lattice/lag[unit:steps]", 0, 0, 11, 0.0001));
ltDecay   = C(hslider("h:lattice/decay[unit:s]", 0.7, 0.1, 4, 0.001));
ltAttack  = C(hslider("h:lattice/attack[unit:s]", 0.006, 0.002, 0.05, 0.0001));
ltTone    = C(hslider("h:lattice/tone", 0.6, 0, 1, 0.001));
ltBright  = C(hslider("h:lattice/bright", 0.35, 0, 1, 0.001));
ltDensity = C(hslider("h:lattice/density", 1, 0, 1, 0.001));
ltSpread  = C(hslider("h:lattice/spread", 0.35, 0, 0.6, 0.001));
ltSpace   = C(hslider("h:lattice/space", 0.35, 0, 1, 0.001));
ltOct     = D(nentry("h:lattice/octave", 1, 0, 3, 1));

// Four figures, twelve steps each (scale degrees; 7 is the octave; -1 rests).
figures = waveform{
   0,  4,  7,  2,  9,  4,  0,  7,  4,  2,  9,  7,
   0, -1,  4,  7, -1,  4,  9, -1,  7,  4, -1,  2,
   4,  5,  7,  4,  2,  4,  5,  9,  7,  5,  4,  2,
   7, -1, -1,  4, -1,  9, -1, -1,  2, -1,  7, -1
};
figure(s) = figures, int(ltPattern * 12 + s) : rdtable;

ltSteps = barPos * 4.0 * ltRate;        // steps since the session began

line(pos, k) = (voice(0) + voice(1))
with {
  ip   = int(pos + 1200.0);              // 1200 = 100 figures: keeps the index positive
  step = ip % 12;
  t0   = (ip != ip') * (1 - impulse);
  d    = figure(step);
  t    = t0 * (d >= 0) * (u01(seed, k) < ltDensity);
  rr   = ((+(t)) ~ _) % 2;
  key  = (root + 12 * ltOct + semisOf(max(0, d))) : ba.sAndH(t);
  vel  = (0.8 + 0.2 * u01(seed, k + 1)) : ba.sAndH(t);
  voice(j) = mallet(tj, midiHz(key : ba.sAndH(tj)), vel : ba.sAndH(tj), ltDecay, ltAttack, ltTone, ltBright)
  with { tj = t * (rr == j); };
};

latticeG = db2lin(ltLevel) * 1.4;
latticeS = pan(0.0 - ltSpread, line(ltSteps, 740) * latticeGate * latticeG);
phaseS   = pan(ltSpread, line(ltSteps - ltLag, 760) * phaseGate * latticeG);

//===================================================================================
// Space — a large dark room, a ping-pong tape delay, M/S width, crossfeed
//===================================================================================

roomWet   = C(hslider("h:space/room", 0.35, 0, 1, 0.001));
roomT60   = C(hslider("h:space/roomT60[unit:s]", 4, 0.5, 12, 0.01));
roomDamp  = hslider("h:space/damp[unit:Hz]", 4500, 1500, 10000, 1);
dubFb     = C(hslider("h:space/dubFeedback", 0.35, 0, 0.8, 0.001));
dubDiv    = D(nentry("h:space/dubDiv[unit:beats]", 1.5, 0.25, 4, 0.25));
dubLP     = C(hslider("h:space/dubTone[unit:Hz]", 2400, 400, 8000, 1));
dubMix    = C(hslider("h:space/dubMix", 0.25, 0, 1, 0.001));
width     = C(hslider("h:space/width", 0.9, 0, 1.2, 0.001));
crossfeed = C(hslider("h:space/crossfeed", 0.2, 0, 0.5, 0.001));

ebpm    = clock : (!, _);
dubTime = min(60000.0, max(64.0, 60.0 / ebpm * dubDiv * SR)) : si.smooth(ba.tau2pole(0.4));
dubT    = dubTime * (1.0 + 0.0012 * sin(2.0 * ma.PI * phasor(0.31)) + 0.0005 * sin(2.0 * ma.PI * phasor(1.7)));
dubIn   = (L(bloomS) + R(bloomS)) * 0.5 * blSpace * 0.6 + (L(latticeS) + R(latticeS) + L(phaseS) + R(phaseS)) * 0.5 * ltSpace;
dub     = (dubIn, 0.0) : pingpong(dubT, dubFb, dubLP);

roomInL = L(bankS) * 0.6 + L(glowS) * 0.8 + breathL * 0.5 + L(bloomS) * blSpace * 1.6 + (L(latticeS) + L(phaseS)) * ltSpace * 1.2 + droneM * 0.08;
roomInR = R(bankS) * 0.6 + R(glowS) * 0.8 + breathR * 0.5 + R(bloomS) * blSpace * 1.6 + (R(latticeS) + R(phaseS)) * ltSpace * 1.2 + droneM * 0.08;
room    = (roomInL, roomInR) : re.zita_rev1_stereo(40, 180, roomDamp, roomT60 * 1.15, roomT60, 48000) : (*(roomWet), *(roomWet));

mixL = L(bankS) + droneM + L(glowS) + breathL + L(bloomS) + L(latticeS) + L(phaseS) + L(room) + L(dub) * dubMix;
mixR = R(bankS) + droneM + R(glowS) + breathR + R(bloomS) + R(latticeS) + R(phaseS) + R(room) + R(dub) * dubMix;

//===================================================================================
// Bus, master, guard, limiter, keep-alive (as in the Pulse engine)
//===================================================================================

glue       = C(hslider("h:master/glue", 0.3, 0, 1, 0.001));
glueThresh = C(hslider("h:master/glueThreshold[unit:dB]", -14, -40, 0, 0.1));
tape       = C(hslider("h:master/drive", 0.1, 0, 1, 0.001));
master     = C(hslider("h:master/level[unit:dB]", -12, -60, 0, 0.1));
ceilDb     = C(hslider("h:guard/ceiling[unit:dBFS]", -18, -60, -1, 0.1));
crestDb    = C(hslider("h:guard/crest[unit:dB]", 14, 6, 24, 0.1));
maxLoudDb  = C(hslider("h:guard/maxLoudness[unit:dB]", -26, -60, -6, 0.1));
maxBright  = C(hslider("h:guard/maxBrightness[unit:dB]", -14, -40, 0, 0.1));
floorDb    = C(hslider("h:keepalive/level[unit:dBFS]", -64, -90, -50, 0.1));
floorOn    = C(nentry("h:keepalive/on", 1, 0, 1, 1));

chain = (mixL, mixR) : msWidth(width) : xfeed(crossfeed) : bus(glue, glueThresh, tape)
        : (*(db2lin(master)), *(db2lin(master)))
        : guardStage(maxLoudDb, maxBright) : limiter(crestDb, ceilDb)
        : (+(floorTone(floorDb, floorOn)), +(floorTone(floorDb, floorOn)));

process = chain : (attach(_, bi : hbargraph("bar", 0, 1.0e9)), attach(_, ls : hbargraph("latchedCommit", 0, 1.0e12)));
