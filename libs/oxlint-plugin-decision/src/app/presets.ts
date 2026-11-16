export { default } from "./recommended.ts";
export { presets, recommended, reviewOnly, strict } from "#/features/define-presets/index.ts";
export type { Preset } from "#/features/define-presets/index.ts";
export {
  domainNaming,
  nameMatchesBehavior,
  noHardcodedSecrets,
  noPiiInLogs,
  noPromptInjection,
  preferSchemaValidation,
  untrustedInputRisk,
} from "#/features/define-presets/index.ts";
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
} from "#/features/define-presets/index.ts";
export {
  describeNamesSubject,
  snapshotOnlyBehaviourClaim,
  testClaims,
  testMocksSubject,
  testNameDescribesCode,
  testNameVerifiesClaim,
} from "#/features/define-presets/index.ts";
