import { parseJsonlLines } from "claude-code-jsonl-parser";
import type { ParsedLine, UserContentBlock } from "claude-code-jsonl-parser";
import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

type Utterance = Readonly<{ uuid: string; timestamp: string; text: string }>;

type Candidate = Readonly<{ uuid: string; timestamp: string; owner: boolean; text: string }>;

const WAKE = /<wake[\s>]/u;
const RELAY = /<relay[\s>]/u;
const SPOKEN =
  /<message\b[^>]*\bfrom="human"[^>]*>(?<message>[\s\S]*?)<\/message>|<cited\b[^>]*\bauthor="user"[^>]*>(?<cited>[\s\S]*?)<\/cited>/gu;
const REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/gu;
const MACHINE = /^<(?:local-command-|bash-stdout|bash-stderr|task-notification)/u;
const HUMAN = "human";
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

const blockText = Match.type<UserContentBlock>().pipe(
  Match.when({ _kind: "known", type: "text" }, (block) => Option.some(block.text)),
  Match.orElse(() => Option.none<string>()),
);

const contentText = Match.type<string | readonly UserContentBlock[]>().pipe(
  Match.when(Str.isString, (text) => text),
  Match.orElse((blocks) => pipe(blocks, Arr.map(blockText), Arr.getSomes, Arr.join("\n"))),
);

const typedByOwner = (
  entry: Readonly<{ isMeta?: boolean; origin?: Readonly<{ kind: string }> }>,
): boolean =>
  entry.isMeta !== true &&
  Option.match(Option.fromUndefinedOr(entry.origin), {
    onNone: () => true,
    onSome: (origin) => origin.kind === HUMAN,
  });

const candidateOf = Match.type<ParsedLine>().pipe(
  Match.when({ _kind: "known", type: "user" }, (entry) => {
    const text = contentText(entry.message.content);
    return Option.some<Candidate>({
      uuid: entry.uuid,
      timestamp: entry.timestamp,
      owner:
        !entry.isSidechain &&
        entry.isCompactSummary !== true &&
        (typedByOwner(entry) || RELAY.test(text)),
      text,
    });
  }),
  Match.orElse(() => Option.none<Candidate>()),
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

const textsOf = (text: string): readonly string[] =>
  Match.value(text).pipe(
    Match.when((value) => WAKE.test(value) || RELAY.test(value), spokenIn),
    Match.orElse(typedIn),
  );

const utterancesOf = (candidate: Candidate): readonly Utterance[] =>
  pipe(
    textsOf(candidate.text),
    Arr.filter(Str.isNonEmpty),
    Arr.map((text) => ({ uuid: candidate.uuid, timestamp: candidate.timestamp, text })),
  );

const ownerUtterances = (jsonl: string): readonly Utterance[] =>
  pipe(
    Arr.fromIterable(parseJsonlLines(jsonl)),
    Arr.map(candidateOf),
    Arr.getSomes,
    Arr.filter((candidate) => candidate.owner),
    Arr.flatMap(utterancesOf),
  );

export { ownerUtterances };
export type { Utterance };
