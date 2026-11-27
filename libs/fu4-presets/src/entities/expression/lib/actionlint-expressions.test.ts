import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Option,
  Path,
  Record as Rec,
  Result,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import type { ExprError } from "#/entities/expression/model/ast.ts";
import { describe, objectOf } from "#/entities/expression/model/types.ts";
import type { ExprType, ObjectType } from "#/entities/expression/model/types.ts";

import { checkerOf } from "./checker.ts";
import type { Checker } from "./checker.ts";
import { parse } from "./parser.ts";

const FIXTURE = "fixtures/actionlint/expressions.json.gz";
const KNOWN = "fixtures/actionlint/expressions-known-failures.txt";
const DISPATCH = "dispatchInputs";
const INPUTS = "inputs";
const NEXT = 1;
const CUSTOM_FUNCTIONS = "not run: custom function signatures";

interface RecordedObject {
  readonly kind: "object";
  readonly props: Readonly<Record<string, RecordedType>>;
  readonly mapped: RecordedType | null;
}

interface RecordedArray {
  readonly kind: "array";
  readonly elem: RecordedType;
  readonly deref: boolean;
}

type RecordedType =
  | { readonly kind: "any" | "null" | "number" | "bool" | "string" }
  | RecordedObject
  | RecordedArray;

type Lazy = () => Schema.Codec<RecordedType>;

const objectMember = (lazy: Lazy): Schema.Codec<RecordedObject> =>
  Schema.Struct({
    kind: Schema.Literal("object"),
    props: Schema.Record(Schema.String, Schema.suspend(lazy)),
    mapped: Schema.NullOr(Schema.suspend(lazy)),
  });

const arrayMember = (lazy: Lazy): Schema.Codec<RecordedArray> =>
  Schema.Struct({
    kind: Schema.Literal("array"),
    elem: Schema.suspend(lazy),
    deref: Schema.Boolean,
  });

const PrimitiveSchema = Schema.Struct({
  kind: Schema.Literals(["any", "null", "number", "bool", "string"]),
});

const TypeSchema: Schema.Codec<RecordedType> = Schema.Union([
  PrimitiveSchema,
  objectMember(() => TypeSchema),
  arrayMember(() => TypeSchema),
]);

const ErrorSchema = Schema.Struct({
  message: Schema.String,
  line: Schema.Int,
  column: Schema.Int,
});

const ParseSchema = Schema.Struct({
  id: Schema.String,
  src: Schema.String,
  error: Schema.NullOr(ErrorSchema),
});

const UpdateSchema = Schema.Struct({ name: Schema.String, type: TypeSchema });

const CheckSchema = Schema.Struct({
  id: Schema.String,
  src: Schema.String,
  untrusted: Schema.Boolean,
  configVars: Schema.String.pipe(Schema.Array, Schema.NullOr),
  contexts: Schema.Array(Schema.String),
  specialFunctions: Schema.Array(Schema.String),
  updates: Schema.Array(UpdateSchema),
  vars: Schema.Record(Schema.String, TypeSchema),
  removedVars: Schema.Array(Schema.String),
  customFunctions: Schema.Boolean,
  type: Schema.String,
  errors: Schema.Array(ErrorSchema),
});

type ParseCase = typeof ParseSchema.Type;
type CheckCase = typeof CheckSchema.Type;
type Update = typeof UpdateSchema.Type;

const Recorded = Schema.fromJsonString(
  Schema.Struct({ parses: Schema.Array(ParseSchema), checks: Schema.Array(CheckSchema) }),
);

interface Outcome {
  readonly id: string;
  readonly want: readonly string[];
  readonly have: readonly string[];
}

const errorKey = ({
  message,
  line,
  column,
}: Pick<ExprError, "message" | "line" | "column">): string =>
  `${String(line)}:${String(column)} ${message}`;

const typeOf = (recorded: RecordedType): ExprType => {
  if (recorded.kind === "object") {
    return objectOf(pipe(recorded.props, Rec.map(typeOf)))(
      pipe(Option.fromNullishOr(recorded.mapped), Option.map(typeOf)),
    );
  }
  if (recorded.kind === "array") {
    return { kind: "array", elem: typeOf(recorded.elem), deref: recorded.deref };
  }
  return { kind: recorded.kind };
};

const objectTypeOf = (recorded: RecordedType): ObjectType => {
  const type = typeOf(recorded);
  if (type.kind === "object") {
    return type;
  }
  return objectOf({})(Option.none());
};

const followsDispatch = (updates: readonly Update[], index: number): boolean =>
  pipe(
    Arr.get(updates, index - NEXT),
    Option.exists((before) => before.name === DISPATCH),
  );

type Updater = (checker: Checker) => (type: ObjectType) => void;

const UPDATERS: Readonly<Record<string, Updater>> = {
  [DISPATCH]: (checker) => checker.updateDispatchInputs,
  [INPUTS]: (checker) => checker.updateInputs,
  secrets: (checker) => checker.updateSecrets,
};

const apply =
  (checker: Checker, updates: readonly Update[]) =>
  (update: Update, index: number): void => {
    if (update.name === INPUTS && followsDispatch(updates, index)) {
      return;
    }
    const type = objectTypeOf(update.type);
    Option.match(Rec.get(UPDATERS, update.name), {
      onNone: () => {
        checker.setVar(update.name, type);
      },
      onSome: (updater) => {
        updater(checker)(type);
      },
    });
  };

const parseOutcome = (found: ParseCase): Outcome => ({
  id: found.id,
  want: pipe(Option.fromNullishOr(found.error), Option.map(errorKey), Option.toArray),
  have: Result.match(parse(found.src).result, {
    onFailure: (error) => [errorKey(error)],
    onSuccess: () => [],
  }),
});

const checkerFor = (found: CheckCase): Checker => {
  const checker = checkerOf({
    untrusted: found.untrusted,
    configVars: Option.fromNullishOr(found.configVars),
  });
  checker.setAvailability({ contexts: found.contexts, functions: found.specialFunctions });
  for (const name of found.removedVars) {
    checker.removeVar(name);
  }
  for (const [name, type] of Rec.toEntries(found.vars)) {
    checker.setVar(name, typeOf(type));
  }
  const applied = apply(checker, found.updates);
  for (const [index, update] of found.updates.entries()) {
    applied(update, index);
  }
  return checker;
};

const checkOutcome = (found: CheckCase): Outcome => {
  const want = [`type ${found.type}`, ...pipe(found.errors, Arr.map(errorKey))];
  if (found.customFunctions) {
    return { id: found.id, want, have: [CUSTOM_FUNCTIONS] };
  }
  const checker = checkerFor(found);
  return Result.match(parse(found.src).result, {
    onFailure: (error) => ({ id: found.id, want, have: [`parse ${errorKey(error)}`] }),
    onSuccess: (expr) => {
      const checked = checker.check(expr);
      return {
        id: found.id,
        want,
        have: [`type ${describe(checked.type)}`, ...pipe(checked.errors, Arr.map(errorKey))],
      };
    },
  });
};

const differs = (outcome: Outcome): boolean =>
  !Arr.makeEquivalence(Str.Equivalence)(outcome.want, outcome.have);

const knownIds = (text: string): readonly string[] =>
  pipe(
    Str.split("\n")(text),
    Arr.map((line) => Str.trim(Arr.headNonEmpty(Str.split(" #")(line)))),
    Arr.filter(Str.isNonEmpty),
  );

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const recorded = Effect.gen(function* recorded() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = yield* here;
  const bytes = yield* fileSystem.readFile(path.join(dir, FIXTURE));
  const gzipped = new Blob([Uint8Array.from(bytes)]).stream();
  const text = yield* Effect.promise(() =>
    new Response(gzipped.pipeThrough(new DecompressionStream("gzip"))).text(),
  );
  return yield* Schema.decodeEffect(Recorded)(text);
});

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

test("parses and checks every expression actionlint's tests check as actionlint does", () =>
  Effect.gen(function* matchesEveryExpression() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* here;
    const { parses, checks } = yield* recorded;
    const knownText = yield* fileSystem.readFileString(path.join(dir, KNOWN));
    const known = knownIds(knownText);
    const outcomes = [
      ...pipe(parses, Arr.map(parseOutcome)),
      ...pipe(checks, Arr.map(checkOutcome)),
    ];
    const failing = pipe(outcomes, Arr.filter(differs));
    expect({
      unexpected: pipe(
        failing,
        Arr.filter((outcome) => !Arr.contains(known, outcome.id)),
      ),
      fixed: pipe(
        known,
        Arr.filter(
          (id) =>
            !pipe(
              failing,
              Arr.some((outcome) => outcome.id === id),
            ),
        ),
      ),
    }).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));
