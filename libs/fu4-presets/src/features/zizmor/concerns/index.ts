import { Array as Arr, Record as Rec } from "effect";

import type { Audit } from "#/features/zizmor/model/audit.ts";

import { CONFIG } from "./config.ts";
import { CREDENTIALS } from "./credentials.ts";
import { INJECTION } from "./injection.ts";
import { SUPPLY_CHAIN } from "./supply-chain.ts";
import { WORKFLOW } from "./workflow.ts";

export const CONCERNS = {
  injection: INJECTION,
  "supply-chain": SUPPLY_CHAIN,
  credentials: CREDENTIALS,
  workflow: WORKFLOW,
  config: CONFIG,
} as const satisfies Readonly<Record<string, readonly Audit[]>>;

export type Concern = keyof typeof CONCERNS;

export const AUDITS: readonly Audit[] = Arr.flatten(Rec.values(CONCERNS));
