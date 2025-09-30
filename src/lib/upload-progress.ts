import { EventEmitter } from 'events';

const globalAny = global as unknown as { __uploadProgressBus?: Map<string, EventEmitter> };

if (!globalAny.__uploadProgressBus) {
  globalAny.__uploadProgressBus = new Map();
}

export function getProgressEmitter(id: string): EventEmitter {
  const bus = globalAny.__uploadProgressBus!;
  let emitter = bus.get(id);
  if (!emitter) {
    emitter = new EventEmitter();
    // Avoid memory leak warnings for transient many listeners
    emitter.setMaxListeners(50);
    bus.set(id, emitter);
  }
  return emitter;
}

export function disposeProgressEmitter(id: string) {
  const bus = globalAny.__uploadProgressBus!;
  const emitter = bus.get(id);
  if (emitter) {
    emitter.removeAllListeners();
    bus.delete(id);
  }
}


