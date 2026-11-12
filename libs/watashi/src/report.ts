import { Array as Arr, Effect, Schema, String as Str, pipe } from "effect";

type Finding = Readonly<{
  ruleId: string;
  secret: string;
  encoded: boolean;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}>;

const FIRST = 1;
const NONE = 0;

const EMPTY = Effect.succeed("");
const UNKNOWN_RULE = Effect.succeed("secret");
const FIRST_POSITION = Effect.succeed(FIRST);
const NO_POSITION = Effect.succeed(NONE);
const NO_ITEMS = Effect.succeed([]);
const NO_FIELDS = Effect.succeed({});

const Text = Schema.String.pipe(Schema.withDecodingDefaultKey(EMPTY));
const FirstInt = Schema.Int.pipe(Schema.withDecodingDefaultKey(FIRST_POSITION));
const ZeroInt = Schema.Int.pipe(Schema.withDecodingDefaultKey(NO_POSITION));
const Encodings = Schema.NullOr(Schema.Array(Schema.Unknown));

const Match = Schema.Struct({ value: Text, full: Text });

const Location = Schema.Struct({
  start_line: FirstInt,
  end_line: Schema.optionalKey(Schema.Int),
  start_column: FirstInt,
  end_column: ZeroInt,
});

const Reported = Schema.Struct({
  rule_id: Schema.String.pipe(Schema.withDecodingDefaultKey(UNKNOWN_RULE)),
  encodings: Encodings.pipe(Schema.withDecodingDefaultKey(NO_ITEMS)),
  decode_depth: ZeroInt,
  match: Match.pipe(Schema.withDecodingDefaultKey(NO_FIELDS)),
  location: Location.pipe(Schema.withDecodingDefaultKey(NO_FIELDS)),
});

const Findings = Schema.NullOr(Schema.Array(Reported));

const FindingList = Findings.pipe(Schema.withDecodingDefaultKey(NO_ITEMS));

const Report = Schema.fromJsonString(Schema.Struct({ findings: FindingList }));

const decodeReport = Schema.decodeEffect(Report);

const secretOf = (match: typeof Match.Type): string => {
  if (Str.isNonEmpty(match.value)) {
    return match.value;
  }
  return match.full;
};

const toFinding = (raw: typeof Reported.Type): Finding => {
  const { match, location } = raw;
  return {
    ruleId: raw.rule_id,
    secret: secretOf(match),
    encoded: (raw.encodings ?? []).length > NONE || raw.decode_depth > NONE,
    startLine: location.start_line,
    endLine: location.end_line ?? location.start_line,
    startColumn: location.start_column,
    endColumn: location.end_column,
  };
};

const parseReport = (stdout: string): Effect.Effect<readonly Finding[], Schema.SchemaError> =>
  decodeReport(stdout).pipe(Effect.map(({ findings }) => pipe(findings ?? [], Arr.map(toFinding))));

/** @internal */
export { parseReport };
/** @internal */
export type { Finding };
