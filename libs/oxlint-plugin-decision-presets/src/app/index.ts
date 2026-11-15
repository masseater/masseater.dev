export { default } from "./recommended.ts";
export { presets, recommended, reviewOnly, strict } from "#/entities/rule/index.ts";
export type { Preset } from "#/entities/rule/index.ts";
export {
  domainNaming,
  nameMatchesBehavior,
  noHardcodedSecrets,
  noPiiInLogs,
  noPromptInjection,
  preferSchemaValidation,
  untrustedInputRisk,
} from "#/entities/rule/index.ts";
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
} from "#/entities/rule/index.ts";
export {
  describeNamesSubject,
  snapshotOnlyBehaviourClaim,
  testClaims,
  testMocksSubject,
  testNameDescribesCode,
  testNameVerifiesClaim,
} from "#/entities/rule/index.ts";
