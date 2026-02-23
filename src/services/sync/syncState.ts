export type SyncState = 'idle' | 'syncing' | 'error';

let state: SyncState = 'idle';
let lastError: string | null = null;

const listeners = new Set<Function>();

export function setSyncState(newState: SyncState, error?: string) {
  state = newState;

  if (newState === 'error' && error) {
    lastError = error;
  } else if (newState === 'idle') {
    lastError = null;
  }

  notify();
}

export function getSyncState(): { state: SyncState; lastError: string | null } {
  return { state, lastError };
}

export function subscribeToSyncState(fn: Function): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Sync state listener error:', e);
    }
  });
}
