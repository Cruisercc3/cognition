// spike.dsp — Phase 0 spike: proves the parameter contract end to end.
//  * seeded, decorrelated noise (L/R streams differ, seed changes the sequence)
//  * bar clock with bar-latched tempo
//  * commit-latched discrete params (probeA, probeB latch on the same sample)
//  * exact linear ramp on a continuous param (glide), double precision
//  * bargraphs report bar index and latched commit back to the host
// Outputs: 0 L, 1 R (quiet test sound), 2 glide, 3 probeA, 4 probeB (probe channels
// are for tests; the audio host routes only 0 and 1 to the speakers).

declare name "spike";

import("stdfaust.lib");
import("cog.lib");

seed    = nentry("seed", 1, 0, 16777215, 1);
commit  = nentry("commit", 0, 0, 1.0e12, 1);
imm     = nentry("immediate", 0, 0, 1, 1);
rampSec = nentry("rampSec", 0, 0, 3600, 0.001);
bpm     = nentry("bpm", 120, 40, 200, 0.01);

ph = barPhase(bpm, 4);
bt = barTrig(ph);
bi = barIndex(bt);
lt = latchTrig(commit, bt, imm);
ls = latchState(commit, bt, imm);

probeA = latched(lt, nentry("probeA", 0, -1.0e6, 1.0e6, 1));
probeB = latched(lt, nentry("probeB", 0, -1.0e6, 1.0e6, 1));
glide  = ramped(lt, rampSec, nentry("glide", 0.9, -1.0e6, 1.0e6, 0.000001));
level  = ramped(lt, 0.05, db2lin(nentry("level", -36, -90, 0, 0.1)));

noiseL = wnoise(seed, 1) : fi.lowpass(2, 900);
noiseR = wnoise(seed, 2) : fi.lowpass(2, 900);
tone   = os.osc(110) * 0.25;

outL = (noiseL * 0.5 + tone) * level;
outR = (noiseR * 0.5 + tone) * level;

process = attach(outL, bi : hbargraph("bar", 0, 1.0e9)),
          attach(outR, ls : hbargraph("latchedCommit", 0, 1.0e12)),
          glide, probeA, probeB;
