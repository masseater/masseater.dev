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
} from "./model/ai-slop-rules.ts";
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
} from "./model/code-claims.ts";
export { presets, recommended, reviewOnly, strict } from "./model/presets.ts";
export type { Preset } from "./model/presets.ts";
export {
  domainNaming,
  nameMatchesBehavior,
  noHardcodedSecrets,
  noPiiInLogs,
  noPromptInjection,
  preferSchemaValidation,
  untrustedInputRisk,
} from "./model/rules.ts";
export {
  describeNamesSubject,
  snapshotOnlyBehaviourClaim,
  testClaims,
  testMocksSubject,
  testNameDescribesCode,
  testNameVerifiesClaim,
} from "./model/test-claims.ts";
