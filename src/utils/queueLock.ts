import { Mutex } from 'async-mutex';

export const queueLock = new Mutex();
