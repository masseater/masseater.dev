import {
  Array as Arr,
  Option,
  Order,
  Record as Rec,
  Result,
  Schema,
  String as Str,
  pipe,
} from "effect";

import type {
  Config,
  IgnoreRule,
  PolicyEntry,
  RuleConfig,
  UnpinnedUsesPolicies,
  UsesPolicy,
} from "#/features/zizmor/model/config.ts";

import { parsePattern, patternKey } from "./uses.ts";

type Parsed<Value> = Result.Result<Value, string>;

type Mapping = Readonly<Record<string, unknown>>;

const DEFAULT_COOLDOWN = 7;
const NONE = 0;
const ONE_BASED = 1;
const POSITION_PARTS = 2;
const YAML_FILE = /\.ya?ml$/u;
const POSITIVE = /^[1-9]\d*$/u;
const STRICT = { onExcessProperty: "error" } as const;

const Strings = Schema.Array(Schema.String);
const Severities = Schema.Literals(["informational", "low", "medium", "high"]);
const Policies = Schema.Literals(["any", "ref-pin", "hash-pin"]);
const PositiveInt = Schema.Int.check(Schema.isGreaterThan(NONE));
const RawMapping = Schema.Record(Schema.String, Schema.Unknown);
const Remap = Schema.Struct({
  severity: Schema.optionalKey(Schema.NullOr(Severities)),
});
const RawRule = Schema.Struct({
  disable: Schema.optionalKey(Schema.Boolean),
  ignore: Schema.optionalKey(Strings),
  config: Schema.optionalKey(Schema.NullOr(RawMapping)),
  remap: Schema.optionalKey(Schema.NullOr(Remap)),
});
const RawRules = Schema.NullishOr(Schema.Record(Schema.String, RawRule));
const Cooldown = Schema.Struct({
  days: Schema.optionalKey(PositiveInt),
});
const Forbidden = Schema.Union([
  Schema.Struct({ allow: Strings }),
  Schema.Struct({ deny: Strings }),
]);
const Allow = Schema.Struct({ allow: Schema.optionalKey(Strings) });
const Unpinned = Schema.Struct({
  policies: Schema.optionalKey(Schema.Record(Schema.String, Policies)),
});
const Runner = Schema.Struct({
  "deny-runners": Schema.optionalKey(Strings),
  "allow-groups": Schema.optionalKey(Strings),
});

type Decode<Value> = (input: unknown) => Result.Result<Value, Schema.SchemaError>;

const messageOf = (issue: Schema.SchemaError): string => issue.message;

const positiveOf = (text: Option.Option<string>): Parsed<Option.Option<number>> =>
  Option.match(text, {
    onNone: () => Result.succeed(Option.none()),
    onSome: (each) =>
      Result.liftPredicate(
        Option.some(Number(each)),
        () => POSITIVE.test(each),
        () => "invalid number (must be 1-based)",
      ),
  });

const ignoreRule = (value: string): Parsed<IgnoreRule> => {
  const parts = Str.split(":")(value);
  const positions = Arr.takeRight(Arr.drop(parts, ONE_BASED), POSITION_PARTS);
  const filename = Arr.join(Arr.dropRight(parts, positions.length), ":");
  const [line, column] = positions;
  if (!YAML_FILE.test(filename)) {
    return Result.fail(`invalid workflow filename: ${filename}`);
  }
  return Result.gen(function* decode() {
    const lineOf = yield* positiveOf(Option.fromNullishOr(line));
    const columnOf = yield* positiveOf(Option.fromNullishOr(column));
    return { filename, line: lineOf, column: columnOf };
  });
};

const ruleOf = (raw: typeof RawRule.Type): Parsed<RuleConfig> =>
  pipe(
    raw.ignore ?? [],
    Arr.map(ignoreRule),
    Result.all,
    Result.map((ignore) => ({
      disable: raw.disable === true,
      ignore,
      config: Option.fromNullishOr(raw.config),
      remap: pipe(
        Option.fromNullishOr(raw.remap),
        Option.flatMap((remap) => Option.fromNullishOr(remap.severity)),
      ),
    })),
  );

const ruleEntry = ([ident, raw]: readonly [string, typeof RawRule.Type]): Parsed<
  readonly [string, RuleConfig]
> =>
  pipe(
    ruleOf(raw),
    Result.map((rule) => [ident, rule] as const),
  );

const decodeRules = Schema.decodeUnknownResult(RawRules, STRICT);

const rulesOf = (raw: unknown): Parsed<ReadonlyMap<string, RuleConfig>> =>
  pipe(
    decodeRules(raw),
    Result.mapError(messageOf),
    Result.map((each) => Rec.toEntries(each ?? {})),
    Result.flatMap((entries) => Result.all(pipe(entries, Arr.map(ruleEntry)))),
    Result.map((entries) => new Map(entries)),
  );

const settingOf =
  <Raw, Value>(decode: Decode<Raw>, fallback: () => Value) =>
  (finish: (decoded: Raw) => Parsed<Value>) =>
  (config: Option.Option<Mapping>): Parsed<Value> =>
    Option.match(config, {
      onNone: () => Result.succeed(fallback()),
      onSome: (each) => pipe(decode(each), Result.mapError(messageOf), Result.flatMap(finish)),
    });

const noStrings = (): readonly string[] => [];

const cooldownOf = settingOf(
  Schema.decodeUnknownResult(Cooldown, STRICT),
  () => DEFAULT_COOLDOWN,
)((each) => Result.succeed(each.days ?? DEFAULT_COOLDOWN));

const patternsOf =
  (type: "allow" | "deny") =>
  (list: readonly string[]): Parsed<Config["forbiddenUses"]> =>
    pipe(
      list,
      Arr.map(parsePattern),
      Result.all,
      Result.map((patterns) => Option.some({ type, patterns })),
    );

const forbiddenOf = settingOf(
  Schema.decodeUnknownResult(Forbidden, STRICT),
  (): Config["forbiddenUses"] => Option.none(),
)((each) => {
  if ("allow" in each) {
    return patternsOf("allow")(each.allow);
  }
  return patternsOf("deny")(each.deny);
});

const allowOf = settingOf(
  Schema.decodeUnknownResult(Allow, STRICT),
  noStrings,
)((each) => Result.succeed(each.allow ?? []));

const secretsOf = (config: Option.Option<Mapping>): Parsed<ReadonlySet<string>> =>
  pipe(
    allowOf(config),
    Result.map((list) => new Set([...pipe(list, Arr.map(Str.toLowerCase)), "github_token"])),
  );

const knownVulnerableOf = (config: Option.Option<Mapping>): Parsed<ReadonlySet<string>> =>
  pipe(
    allowOf(config),
    Result.map((list) => new Set(list)),
  );

const runnersOf = settingOf(
  Schema.decodeUnknownResult(Runner, STRICT),
  (): readonly [ReadonlySet<string>, ReadonlySet<string>] => [new Set(), new Set()],
)((each) => Result.succeed([new Set(each["deny-runners"]), new Set(each["allow-groups"])]));

const policyEntry = ([text, policy]: readonly [string, UsesPolicy]): Parsed<PolicyEntry> =>
  pipe(
    parsePattern(text),
    Result.flatMap((pattern) => {
      if (pattern.type === "exact-with-ref") {
        return Result.fail(`cannot use exact ref patterns here: \`${text}\``);
      }
      return Result.succeed([pattern, policy] as const);
    }),
  );

const ownerOf = ([pattern]: PolicyEntry): string => {
  if ("owner" in pattern) {
    return pattern.owner;
  }
  return "";
};

const byPattern = Order.mapInput(
  Order.Tuple([Order.Number, Order.Array(Order.String)]),
  ([pattern]: PolicyEntry) => patternKey(pattern),
);

const fallbackOf = (entries: readonly PolicyEntry[]): UsesPolicy =>
  pipe(
    entries,
    Arr.findLast(([pattern]) => pattern.type === "any"),
    Option.map(([, policy]) => policy),
    Option.getOrElse((): UsesPolicy => "hash-pin"),
  );

const treeOf = (entries: readonly PolicyEntry[]): UnpinnedUsesPolicies["tree"] =>
  pipe(
    entries,
    Arr.filter(([pattern]) => pattern.type !== "any"),
    Arr.groupBy(ownerOf),
    Rec.map(Arr.sortBy(byPattern)),
    Rec.toEntries,
    (each) => new Map(each),
  );

const unpinnedOf = settingOf(
  Schema.decodeUnknownResult(Unpinned, STRICT),
  (): Readonly<Record<string, UsesPolicy>> => ({}),
)((each) => Result.succeed(each.policies ?? {}));

const policiesOf = (config: Option.Option<Mapping>): Parsed<UnpinnedUsesPolicies> =>
  pipe(
    unpinnedOf(config),
    Result.flatMap((policies) => Result.all(pipe(Rec.toEntries(policies), Arr.map(policyEntry)))),
    Result.map((entries) => ({ tree: treeOf(entries), fallback: fallbackOf(entries) })),
  );

const configOf =
  (rules: ReadonlyMap<string, RuleConfig>) =>
  (ident: string): Option.Option<Mapping> =>
    pipe(
      Option.fromNullishOr(rules.get(ident)),
      Option.flatMap((rule) => rule.config),
    );

const withRules = (rules: ReadonlyMap<string, RuleConfig>): Parsed<Config> => {
  const of = configOf(rules);
  const settings = {
    cooldownDays: cooldownOf(of("dependabot-cooldown")),
    forbiddenUses: forbiddenOf(of("forbidden-uses")),
    secretsAllow: secretsOf(of("secrets-outside-env")),
    unpinnedUses: policiesOf(of("unpinned-uses")),
    knownVulnerableAllow: knownVulnerableOf(of("known-vulnerable-actions")),
    runners: runnersOf(of("self-hosted-runner")),
  };
  return pipe(
    Result.all(settings),
    Result.map(({ runners: [denyRunners, allowGroups], ...rest }) => ({
      rules,
      denyRunners,
      allowGroups,
      ...rest,
    })),
  );
};

export const loadConfig = (raw: unknown): Parsed<Config> =>
  pipe(rulesOf(raw), Result.flatMap(withRules));
