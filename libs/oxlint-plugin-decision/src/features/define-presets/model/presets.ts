import type { DecisionRule } from "#/entities/decision/index.ts";

import {
  catchHidesFailure,
  commentDescribesBlock,
  commentDescribesDeclaration,
  docErrorsMatchBody,
  errorMessageMatchesCondition,
  fnNamePromises,
  idempotentName,
  logLevelMatchesEvent,
  logMessageMatchesEvent,
  pureNameIsPure,
  safeNameIsSafe,
  varNameDescribesValue,
} from "./code-claims.ts";
import {
  domainNaming,
  nameMatchesBehavior,
  noHardcodedSecrets,
  noPiiInLogs,
  noPromptInjection,
  preferSchemaValidation,
  untrustedInputRisk,
} from "./rules.ts";
import {
  describeNamesSubject,
  snapshotOnlyBehaviourClaim,
  testMocksSubject,
  testNameDescribesCode,
  testNameVerifiesClaim,
} from "./test-claims.ts";

export type Preset = readonly [DecisionRule, ...DecisionRule[]];

export const recommended: Preset = [noPiiInLogs, noPromptInjection, noHardcodedSecrets];

export const strict: Preset = [
  ...recommended,
  nameMatchesBehavior,
  untrustedInputRisk,
  pureNameIsPure,
  safeNameIsSafe,
  idempotentName,
  catchHidesFailure,
  testNameVerifiesClaim,
  testMocksSubject,
];

export const reviewOnly: Preset = [
  domainNaming,
  preferSchemaValidation,
  fnNamePromises,
  commentDescribesDeclaration,
  commentDescribesBlock,
  docErrorsMatchBody,
  errorMessageMatchesCondition,
  logLevelMatchesEvent,
  logMessageMatchesEvent,
  varNameDescribesValue,
  describeNamesSubject,
  testNameDescribesCode,
  snapshotOnlyBehaviourClaim,
];

export const presets = { recommended, strict, reviewOnly } as const satisfies Readonly<
  Record<string, Preset>
>;
