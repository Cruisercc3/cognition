import type { CogBridge } from '../shared/ipc.ts';

declare global {
  interface Window {
    cog: CogBridge;
  }
}

export {};
