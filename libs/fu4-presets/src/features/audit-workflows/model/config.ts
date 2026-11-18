import type { Option } from "effect";

import type { UsesPattern } from "#/features/audit-workflows/lib/uses.ts";

import type { Severity } from "./finding.ts";

export const USES_POLICIES = ["any", "ref-pin", "hash-pin"] as const;
export type UsesPolicy = (typeof USES_POLICIES)[number];

export const ALLOW_DENY = ["allow", "deny"] as const;
export type AllowDeny = (typeof ALLOW_DENY)[number];

export interface IgnoreRule {
  readonly filename: string;
  readonly line: Option.Option<number>;
  readonly column: Option.Option<number>;
}

export interface RuleConfig {
  readonly disable: boolean;
  readonly ignore: readonly IgnoreRule[];
  readonly config: Option.Option<Readonly<Record<string, unknown>>>;
  readonly remap: Option.Option<Severity>;
}

export type PolicyEntry = readonly [UsesPattern, UsesPolicy];

export interface UnpinnedUsesPolicies {
  readonly tree: ReadonlyMap<string, readonly PolicyEntry[]>;
  readonly fallback: UsesPolicy;
}

export interface Config {
  readonly rules: ReadonlyMap<string, RuleConfig>;
  readonly cooldownDays: number;
  readonly forbiddenUses: Option.Option<{
    readonly type: AllowDeny;
    readonly patterns: readonly UsesPattern[];
  }>;
  readonly secretsAllow: ReadonlySet<string>;
  readonly unpinnedUses: UnpinnedUsesPolicies;
  readonly knownVulnerableAllow: ReadonlySet<string>;
  readonly denyRunners: ReadonlySet<string>;
  readonly allowGroups: ReadonlySet<string>;
}
