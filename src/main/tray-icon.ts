// Tray icon drawn in code (no binary assets): a soft ring, 32x32 @2x.

import { nativeImage, type NativeImage } from 'electron';

export function trayIcon(active: boolean): NativeImage {
  const size = 32;
  const buf = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2;
  const [r, g, b] = active ? [111, 179, 168] : [150, 150, 150];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      // ring between radius 9 and 14, filled dot when active
      const ring = Math.max(0, 1 - Math.abs(d - 11.5) / 2.5);
      const dot = active ? Math.max(0, 1 - Math.max(0, d - 4) / 1.5) : 0;
      const a = Math.min(1, ring + dot);
      const i = (y * size + x) * 4;
      buf[i] = b; // BGRA
      buf[i + 1] = g;
      buf[i + 2] = r;
      buf[i + 3] = Math.round(a * 255);
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: 2 });
}
