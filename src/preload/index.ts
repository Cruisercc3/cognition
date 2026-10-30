// Sandboxed preload: a narrow, allow-listed bridge. Renderers never get ipcRenderer.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { TO_MAIN, TO_RENDERER, INVOKE, type CogBridge } from '../shared/ipc.ts';

const toMain = new Set<string>(TO_MAIN);
const toRenderer = new Set<string>(TO_RENDERER);
const invoke = new Set<string>(INVOKE);

const bridge: CogBridge = {
  send(channel, data) {
    if (!toMain.has(channel)) throw new Error(`blocked channel ${channel}`);
    ipcRenderer.send(channel, data);
  },
  on(channel, cb) {
    if (!toRenderer.has(channel)) throw new Error(`blocked channel ${channel}`);
    const listener = (_e: IpcRendererEvent, data: unknown) => cb(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  invoke(channel, data) {
    if (!invoke.has(channel)) return Promise.reject(new Error(`blocked channel ${channel}`));
    return ipcRenderer.invoke(channel, data);
  }
};

contextBridge.exposeInMainWorld('cog', bridge);
