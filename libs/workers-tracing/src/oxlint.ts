import { Array as Arr, pipe } from "effect";

interface RestrictedImport {
  readonly name: string;
  readonly importNames: readonly string[];
  readonly allowTypeImports?: boolean;
  readonly message: string;
}

interface RestrictedProperty {
  readonly object: string;
  readonly property: string;
  readonly message: string;
}

interface RestrictedSyntax {
  readonly selector: string;
  readonly message: string;
}

const RUN_MESSAGE =
  "Run Effects with run or runner from @r_masseater/workers-tracing/effect, so their spans reach the Workers trace.";

const RUN_FUNCTIONS = [
  "runPromise",
  "runPromiseExit",
  "runFork",
  "runCallback",
  "runSync",
  "runSyncExit",
  "runPromiseWith",
  "runPromiseExitWith",
  "runForkWith",
  "runCallbackWith",
  "runSyncWith",
  "runSyncExitWith",
];

const restrictedImports: readonly RestrictedImport[] = [
  {
    name: "elysia",
    importNames: ["Elysia", "default"],
    allowTypeImports: true,
    message:
      "Import Elysia from @r_masseater/workers-tracing/elysia, so every handle call is a span.",
  },
  { name: "effect/Effect", importNames: RUN_FUNCTIONS, message: RUN_MESSAGE },
  { name: "effect/ManagedRuntime", importNames: ["make"], message: RUN_MESSAGE },
];

const restrictedProperties: readonly RestrictedProperty[] = [
  ...pipe(
    RUN_FUNCTIONS,
    Arr.map((property) => ({
      object: "Effect",
      property,
      message: RUN_MESSAGE,
    })),
  ),
  { object: "ManagedRuntime", property: "make", message: RUN_MESSAGE },
];

const restrictedSyntax: readonly RestrictedSyntax[] = [
  {
    selector:
      'CallExpression[callee.property.name="run"][callee.object.property.name="AI"]:not(CallExpression[callee.name="runWorkersAi"] *)',
    message:
      "Call Workers AI inside runWorkersAi from @r_masseater/workers-tracing/workers-ai, so an out-of-capacity error is retried and a cut-off answer is logged.",
  },
];

export type { RestrictedImport, RestrictedProperty, RestrictedSyntax };
export { restrictedImports, restrictedProperties, restrictedSyntax };
