import { DexieRepo } from "./dexie";
import type { Repo } from "./types";

export type { Repo, UserScope } from "./types";
export { DexieRepo } from "./dexie";
export { MemoryRepo } from "./memory";

let singleton: Repo | null = null;

export function createRepo(): Repo {
  if (singleton) return singleton;
  singleton = new DexieRepo();
  return singleton;
}

export function setRepo(repo: Repo): void {
  singleton = repo;
}

export function resetRepoSingleton(): void {
  singleton = null;
}
