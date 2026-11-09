import { Array as Arr, Match, Option, Schema, String as Str, pipe } from "effect";

const Block = Schema.Struct({
  type: Schema.String,
  text: Schema.optionalKey(Schema.String),
});

const Blocks = Schema.Array(Block);

const Content = Schema.Union([Schema.String, Blocks]);

const Message = Schema.Struct({ content: Content });

const TranscriptUserLine = Schema.Struct({
  type: Schema.Literal("user"),
  uuid: Schema.String,
  timestamp: Schema.String,
  isMeta: Schema.optionalKey(Schema.Boolean),
  isSidechain: Schema.optionalKey(Schema.Boolean),
  isCompactSummary: Schema.optionalKey(Schema.Boolean),
  message: Message,
});

type UserLine = typeof TranscriptUserLine.Type;

type Utterance = Readonly<{ uuid: string; timestamp: string; text: string }>;

const decodeLine = Schema.decodeOption(Schema.fromJsonString(TranscriptUserLine));

const WAKE = /<wake[\s>]/u;
const SPOKEN =
  /<message\b[^>]*\bfrom="human"[^>]*>(?<message>[\s\S]*?)<\/message>|<cited\b[^>]*\bauthor="user"[^>]*>(?<cited>[\s\S]*?)<\/cited>/gu;
const REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/gu;
const MACHINE = /^<(?:local-command-|bash-stdout|bash-stderr|task-notification)/u;
const ENTITIES: readonly (readonly [RegExp, string])[] = [
  [/&lt;/gu, "<"],
  [/&gt;/gu, ">"],
  [/&quot;/gu, '"'],
  [/&#39;/gu, "'"],
  [/&amp;/gu, "&"],
];

const unescape = (text: string): string =>
  Arr.reduce(ENTITIES, text, (current, [pattern, value]) =>
    Str.replaceAll(pattern, value)(current),
  );

const blockText = (block: typeof Block.Type): Option.Option<string> =>
  pipe(
    Option.liftPredicate(block, (candidate) => candidate.type === "text"),
    Option.flatMap((candidate) => Option.fromUndefinedOr(candidate.text)),
  );

const contentText = (content: typeof Content.Type): string =>
  Match.value(content).pipe(
    Match.when(Str.isString, (text) => text),
    Match.orElse((blocks) => pipe(blocks, Arr.map(blockText), Arr.getSomes, Arr.join("\n"))),
  );

const spokenOf = (match: RegExpMatchArray): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(match.groups),
    Option.flatMap((groups) => Option.fromUndefinedOr(groups["message"] ?? groups["cited"])),
  );

const spokenIn = (text: string): readonly string[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(SPOKEN)(text)),
    Arr.map(spokenOf),
    Arr.getSomes,
    Arr.map((spoken) => unescape(Str.trim(spoken))),
  );

const typedIn = (text: string): readonly string[] =>
  pipe(
    Str.trim(Str.replaceAll(REMINDER, "")(text)),
    Option.liftPredicate((typed) => Str.isNonEmpty(typed) && !MACHINE.test(typed)),
    Option.toArray,
  );

const ownerOf = (line: UserLine): boolean =>
  line.isMeta !== true && line.isSidechain !== true && line.isCompactSummary !== true;

const textsOf = (line: UserLine): readonly string[] =>
  Match.value(contentText(line.message.content)).pipe(
    Match.when((text) => WAKE.test(text), spokenIn),
    Match.orElse(typedIn),
  );

const utterancesOf = (line: UserLine): readonly Utterance[] =>
  pipe(
    textsOf(line),
    Arr.filter(Str.isNonEmpty),
    Arr.map((text) => ({ uuid: line.uuid, timestamp: line.timestamp, text })),
  );

const ownerUtterances = (jsonl: string): readonly Utterance[] =>
  pipe(
    Str.split(jsonl, "\n"),
    Arr.map((line) => decodeLine(line)),
    Arr.getSomes,
    Arr.filter(ownerOf),
    Arr.flatMap(utterancesOf),
  );

export { ownerUtterances };
export type { Utterance };
