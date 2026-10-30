// Node-side WebAssembly compile (main process, tools, tests).

/** Node has WebAssembly at run time, but the node config's libs only declare its types, so reach it through globalThis. */
export function compileWasm(bytes: Uint8Array): Promise<WebAssembly.Module> {
  const wa = (globalThis as unknown as { WebAssembly: { compile(b: Uint8Array): Promise<WebAssembly.Module> } }).WebAssembly;
  return wa.compile(bytes);
}
