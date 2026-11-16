export {
  aiSlopRules,
  castInsteadOfNarrowing,
  commentNarratesHistory,
  commentRestatesCode,
  defaultMasksMissingValue,
  docRestatesSignature,
  passThroughWrapper,
  placeholderImplementation,
  redundantGuard,
  reinventsBuiltin,
  suppressionInsteadOfFix,
} from "#/features/define-presets/model/ai-slop-rules.ts";
export {
  catchHidesFailure,
  codeClaims,
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
} from "#/features/define-presets/model/code-claims.ts";
export {
  presets,
  recommended,
  reviewOnly,
  strict,
} from "#/features/define-presets/model/presets.ts";
export type { Preset } from "#/features/define-presets/model/presets.ts";
export {
  domainNaming,
  nameMatchesBehavior,
  noHardcodedSecrets,
  noPiiInLogs,
  noPromptInjection,
  preferSchemaValidation,
  untrustedInputRisk,
} from "#/features/define-presets/model/rules.ts";
export {
  describeNamesSubject,
  snapshotOnlyBehaviourClaim,
  testClaims,
  testMocksSubject,
  testNameDescribesCode,
  testNameVerifiesClaim,
} from "#/features/define-presets/model/test-claims.ts";
