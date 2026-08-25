import type { WebviewToExtensionMessage } from './types';

interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let vscodeApiInstance: VsCodeApi | null = null;

export function getVsCodeApi(): VsCodeApi {
  if (!vscodeApiInstance) {
    if (typeof acquireVsCodeApi === 'function') {
      vscodeApiInstance = acquireVsCodeApi();
    } else {
      // Mock for standard browser testing
      vscodeApiInstance = {
        postMessage: (msg: WebviewToExtensionMessage) => {
          console.log('[Mock VS Code API] postMessage:', msg);
        },
        getState: () => ({}),
        setState: () => {}
      };
    }
  }
  return vscodeApiInstance;
}
