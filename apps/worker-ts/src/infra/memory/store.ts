import { filesRepository } from "./files";
import { instancesRepository } from "./instances";
import { keysRepository } from "./keys";
import type { MemoryState } from "./model";
export function createMemoryStore() {
  const state: MemoryState = {
    files: new Map(),
    instances: new Map(),
    keys: new Map(),
  };
  return {
    ...filesRepository(state),
    ...instancesRepository(state),
    ...keysRepository(state),
  };
}
