type SyncState = 'idle' | 'syncing' | 'error';

let state: SyncState = 'idle';
let lastError: string | null = null;

const listeners = new Set<Function>();

export function setSyncing() {
  state = 'syncing';
  notify();
}

export function setIdle() {
  state = 'idle';
  lastError = null;
  notify();
}

export function setError(err: string) {
  state = 'error';
  lastError = err;
  notify();
}

export function getSyncState() {
  return { state, lastError };
}

export function subscribe(fn: Function) {
  listeners.add(fn);

  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn());
}
