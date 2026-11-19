import { CLOSURE_FILE, FINGERPRINT_FILE, LOCK_FILE } from "#/shared/lib/locked-closure-paths.ts";

const NEGATION = "!";
const INSTALLED_LOCK_FILE = "node_modules/.pnpm/lock.yaml";
const WORKSPACE_FILE = "pnpm-workspace.yaml";
const WORKSPACE_MANIFESTS = "*/**/package.json";

export type LockedInput =
  | string
  | { readonly pattern: string; readonly base: "workspace" }
  | { readonly auto: true };

export interface LockedCache {
  readonly input: LockedInput[];
}

const notInput = (file: string): LockedInput => ({
  pattern: `${NEGATION}${file}`,
  base: "workspace",
});

export const LOCKED: LockedCache = {
  input: [
    { auto: true },
    CLOSURE_FILE,
    notInput(FINGERPRINT_FILE),
    notInput(LOCK_FILE),
    notInput(INSTALLED_LOCK_FILE),
    notInput(WORKSPACE_FILE),
    notInput(WORKSPACE_MANIFESTS),
  ],
};
