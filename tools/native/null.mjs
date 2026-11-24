// node nullwav.mjs ref.wav a.wav [b.wav ...]  (32-bit float WAVs with 44-byte headers)
import fs from 'node:fs';
const rd = (f) => {
  const b = fs.readFileSync(f);
  return new Float32Array(b.buffer.slice(b.byteOffset + 44, b.byteOffset + b.length));
};
const [refF, ...rest] = process.argv.slice(2);
const ref = rd(refF);
for (const f of rest) {
  const x = rd(f);
  const n = Math.min(x.length, ref.length);
  let pk = 0, ps = 0, pr = 0;
  for (let i = 0; i < n; i++) {
    const e = x[i] - ref[i];
    if (Math.abs(e) > pk) pk = Math.abs(e);
    ps += ref[i] * ref[i];
    pr += e * e;
  }
  console.log(
    `${f.padEnd(36)} samples ${n}/${ref.length}  peak residual ${(20 * Math.log10(pk || 1e-30)).toFixed(1)} dBFS  residual/signal ${(10 * Math.log10(pr / ps || 1e-30)).toFixed(1)} dB`
  );
}
