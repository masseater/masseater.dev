import { Array as Arr, Option, Predicate, Result, String as Str, pipe } from "effect";

import type {
  DockerUses,
  EnvValue,
  If,
  LoE,
  Permissions,
  RepositoryUses,
  Uses,
} from "#/features/audit-workflows/model/common.ts";

import {
  boolean,
  literal,
  map,
  number,
  optional,
  record,
  string,
  untagged,
  unit,
} from "./decode.ts";
import type { Decoder, Fields } from "./decode.ts";

const OPEN = "${{";
const CLOSE = "}}";
const SLUG_PARTS = 3;
const OWNER_REPO = 2;
const NEXT = 1;
const FALSY = 0;
const DOCKER = "docker://";
const PERMISSION_LEVELS = record(literal(["read", "write", "none"]));

export const isFenced = (raw: string): boolean =>
  Str.startsWith(OPEN)(raw) && Str.endsWith(CLOSE)(raw);

export const loe =
  <Value>(inner: Decoder<Value>): Decoder<LoE<Value>> =>
  (node) => {
    const expr = Result.flatMap(string(node), (raw) =>
      Result.liftPredicate(raw, isFenced, () => "not an expression"),
    );
    if (Result.isSuccess(expr)) {
      return Result.succeed({ type: "expr", raw: expr.success });
    }
    return Result.map(inner(node), (value) => ({ type: "literal", value }));
  };

export const envValue: Decoder<EnvValue> = untagged<EnvValue>(
  map(unit)(() => ({ type: "string", value: "" })),
  map(string)((value) => ({ type: "string", value })),
  map(number)((value) => ({ type: "number", value })),
  map(boolean)((value) => ({ type: "boolean", value })),
);

export const env: Decoder<ReadonlyMap<string, EnvValue>> = record(envValue);

export const displayEnv = (value: EnvValue): string => {
  if (value.type === "string") {
    return value.value;
  }
  if (value.type === "number") {
    return String(value.value);
  }
  return String(value.value);
};

export const ifCondition: Decoder<If> = untagged<If>(
  map(boolean)((value) => ({ type: "bool", value })),
  map(number)((value) => ({ type: "bool", value: value !== FALSY && !Number.isNaN(value) })),
  map(string)((raw) => ({ type: "expr", raw })),
);

export const permissions: Decoder<Permissions> = untagged<Permissions>(
  map(literal(["read-all", "write-all"]))((base) => ({ type: "base", base })),
  map(PERMISSION_LEVELS)((each) => ({
    type: "explicit",
    permissions: each,
  })),
);

export const DEFAULT_PERMISSIONS: Permissions = { type: "base", base: "default" };

const isRegistry = (registry: string): boolean =>
  registry === "localhost" || Str.includes(".")(registry) || Str.includes(":")(registry);

const splitAt =
  (text: string, separator: string) =>
  (index: number): readonly [string, string] => [
    Str.slice(FALSY, index)(text),
    Str.slice(index + separator.length)(text),
  ];

const splitOnce = (text: string, separator: string): Option.Option<readonly [string, string]> =>
  pipe(text, Str.indexOf(separator), Option.map(splitAt(text, separator)));

const imageParts = (image: string): Pick<DockerUses, "image" | "tag" | "hash"> => {
  const pinned = splitOnce(image, "@");
  if (Option.isSome(pinned)) {
    const [name, hash] = pinned.value;
    return { image: name, tag: Option.none(), hash: Option.some(hash) };
  }
  return Option.match(splitOnce(image, ":"), {
    onNone: () => ({ image, tag: Option.none(), hash: Option.none() }),
    onSome: ([name, tag]) => ({
      image: name,
      tag: Option.liftPredicate(tag, Str.isNonEmpty),
      hash: Option.none(),
    }),
  });
};

export const parseDocker = (raw: string): DockerUses => {
  const trimmed = Str.trim(raw);
  const registry = pipe(
    splitOnce(trimmed, "/"),
    Option.filter(([head]) => isRegistry(head)),
  );
  const image = Option.match(registry, { onNone: () => trimmed, onSome: ([, rest]) => rest });
  return {
    type: "docker",
    raw,
    registry: pipe(
      registry,
      Option.map(([head]) => head),
    ),
    ...imageParts(image),
  };
};

const subpathOf = (components: readonly string[]): Option.Option<string> =>
  pipe(
    Option.liftPredicate(components, (each) => each.length >= SLUG_PARTS),
    Option.map((each) => pipe(Arr.drop(each, OWNER_REPO), Arr.join("/"))),
  );

const repositoryOf =
  (raw: string, uses: string) =>
  ([path, gitRef]: readonly [string, string]): Result.Result<RepositoryUses, string> => {
    const components = Str.split("/")(path);
    const [owner, repo] = components;
    if (!Predicate.isString(owner) || !Predicate.isString(repo)) {
      return Result.fail(`malformed \`uses\` ref: owner/repo slug is too short: ${uses}`);
    }
    const subpath = subpathOf(components);
    return Result.succeed({
      type: "repository",
      raw,
      owner,
      repo,
      slug: Option.match(subpath, { onNone: () => path, onSome: () => `${owner}/${repo}` }),
      subpath,
      gitRef,
    });
  };

export const parseRepository = (raw: string): Result.Result<RepositoryUses, string> => {
  const uses = Str.trim(raw);
  return pipe(
    uses,
    Str.lastIndexOf("@"),
    Option.map((at) => [Str.slice(FALSY, at)(uses), Str.slice(at + NEXT)(uses)] as const),
    Result.fromOption(() => `malformed \`uses\` ref: missing \`@<ref>\` in ${uses}`),
    Result.flatMap(repositoryOf(raw, uses)),
  );
};

export const parseUses = (raw: string): Result.Result<Uses, string> => {
  const uses = Str.trim(raw);
  if (Str.startsWith("./")(uses) || Str.startsWith("$/")(uses)) {
    return Result.succeed({ type: "local", raw: uses });
  }
  if (Str.startsWith(DOCKER)(uses)) {
    return Result.succeed(parseDocker(Str.slice(DOCKER.length)(uses)));
  }
  return parseRepository(uses);
};

export const stepUses: Decoder<Uses> = (node) => Result.flatMap(string(node), parseUses);

export const reusableUses: Decoder<Uses> = (node) =>
  Result.flatMap(stepUses(node), (uses) => {
    if (uses.type === "docker") {
      return Result.fail("docker action invalid in reusable workflow `uses`");
    }
    if (uses.type === "local" && Str.includes("@")(uses.raw)) {
      return Result.fail("local reusable workflow reference can't specify `@<ref>`");
    }
    return Result.succeed(uses);
  });

export const boolOrString: Decoder<string> = untagged<string>(map(boolean)(String), string);

export interface StepHead {
  readonly id: Option.Option<string>;
  readonly if: Option.Option<If>;
  readonly name: Option.Option<string>;
}

export const stepHead = (fields: Fields): Result.Result<StepHead, string> =>
  Result.gen(function* decode() {
    const id = yield* optional("id")(string)(fields);
    const condition = yield* optional("if")(ifCondition)(fields);
    const name = yield* optional("name")(string)(fields);
    return { id, if: condition, name };
  });
