import type { TxtNode } from "@textlint/ast-node-types";
import type { TextlintRuleModule } from "@textlint/types";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { tokenize } from "kuromojin";
import type { KuromojiToken } from "kuromojin";
import { SentenceSplitterSyntax, split } from "sentence-splitter";

const COMMA = /[、，]/u;
const PARENTHESES = /[(（](?<inner>[^()（）]*)[)）]/gu;
const LINK_DESTINATION = /\]\([^()]*(?:\)|$)/gu;
const TRAILING_SYMBOLS = /[\s。．.！!？?」』\]】:：*_`~"'〜…-]+$/u;
const CONTINUED = /[、，]$/u;
const FIRST_LEAD = /^(?<lead>[^、，]*)[、，]/u;
const JSX_FILE = /\.[jt]sx?$/u;
const LAST = -1;
const NOT_FOUND = -1;
const LAST_TOKEN_COUNT = 1;
const NO_OFFSET = 0;
const MIN_NOUNS = 1;
const NOUN = "名詞";
const TOPIC_PARTICLE = "係助詞";
const TAIGENDOME_MESSAGE =
  "読点で区切って名詞で終える「〜、〜(体言止め)」の形です。主語と述語のある文に書き直してください。";
const TOPIC_MESSAGE =
  "短い主題の直後で読点を打つ変な区切りです。読点を外してください。たとえば「人は、」「OSSでは、」がこれに当たります。";

type Token = KuromojiToken;
type Range = readonly [number, number];
type Finding = Readonly<{ message: string; range: Range }>;
type Check = Readonly<{ message: string; test: (sentence: string) => Effect.Effect<boolean> }>;

const contentTokens = (text: string): Effect.Effect<readonly Token[]> =>
  pipe(
    Effect.promise(() => tokenize(text)),
    Effect.map(Arr.filter((token) => token.pos !== "記号")),
  );

const isTaigendome = (text: string): Effect.Effect<boolean> => {
  const trimmed = Str.replace(TRAILING_SYMBOLS, "")(text);
  if (!COMMA.test(trimmed) || CONTINUED.test(trimmed)) {
    return Effect.succeed(false);
  }
  return pipe(
    contentTokens(trimmed),
    Effect.map((tokens) =>
      pipe(
        Arr.takeRight(tokens, LAST_TOKEN_COUNT),
        Arr.some((token) => token.pos === NOUN),
      ),
    ),
  );
};

const clauses = (sentence: string): readonly string[] => {
  const text = Str.replaceAll(LINK_DESTINATION, "]")(sentence);
  return [
    Str.replaceAll(PARENTHESES, "")(text),
    ...Arr.map(Arr.fromIterable(Str.matchAll(PARENTHESES)(text)), (match) => match.at(LAST) ?? ""),
  ];
};

const containsTaigendome = (sentence: string): Effect.Effect<boolean> =>
  pipe(
    Effect.forEach(clauses(sentence), isTaigendome, { concurrency: "unbounded" }),
    Effect.map(Arr.contains(true)),
  );

const leadOf = (match: RegExpExecArray): string => match.at(LAST) ?? "";

const firstLead = (sentence: string): string => {
  const match = FIRST_LEAD.exec(Str.trimStart(sentence));
  if (match === null) {
    return "";
  }
  return leadOf(match);
};

const isNounWithTopicParticle = (tokens: readonly Readonly<Token>[]): boolean => {
  const nounCount = pipe(
    Arr.findFirstIndex(tokens, (token) => token.pos !== NOUN),
    Option.getOrElse(() => NOT_FOUND),
  );
  const particles = Arr.drop(tokens, nounCount);
  return (
    nounCount >= MIN_NOUNS &&
    pipe(
      particles,
      Arr.every((token) => token.pos === "助詞"),
    ) &&
    pipe(
      Arr.takeRight(particles, LAST_TOKEN_COUNT),
      Arr.some((token) => token.pos_detail_1 === TOPIC_PARTICLE),
    )
  );
};

const isShortTopicLead = (sentence: string): Effect.Effect<boolean> =>
  Effect.map(contentTokens(firstLead(sentence)), isNounWithTopicParticle);

const CHECKS = [
  { message: TAIGENDOME_MESSAGE, test: containsTaigendome, slideOnly: false },
  { message: TOPIC_MESSAGE, test: isShortTopicLead, slideOnly: true },
] as const;

const sentenceRanges = (text: string): readonly Range[] =>
  pipe(
    split(text),
    Arr.filter((child) => child.type === SentenceSplitterSyntax.Sentence),
    Arr.map(({ range }): Range => range),
  );

const matchedRanges = (ranges: readonly Range[], results: readonly boolean[]): readonly Range[] =>
  pipe(
    Arr.zip(ranges, results),
    Arr.filter(([, found]) => found),
    Arr.map(([range]) => range),
  );

const findingsOf =
  (text: string, ranges: readonly Range[]) =>
  ({ message, test }: Check): Effect.Effect<readonly Finding[]> => {
    const tested = Effect.forEach(ranges, (range) => test(Str.slice(...range)(text)), {
      concurrency: "unbounded",
    });
    return pipe(
      tested,
      Effect.map((results) =>
        Arr.map(matchedRanges(ranges, results), (range): Finding => ({ message, range })),
      ),
    );
  };

const findings = (text: string, checks: readonly Check[]): Effect.Effect<readonly Finding[]> => {
  const perCheck = findingsOf(text, sentenceRanges(text));
  return pipe(
    Effect.forEach(checks, perCheck, { concurrency: "unbounded" }),
    Effect.map(Arr.flatten),
  );
};

const rule: TextlintRuleModule = (context) => {
  const { Syntax, RuleError, report, getSource, locator } = context;
  const inJsx = JSX_FILE.test(context.getFilePath() ?? "");
  const checks = pipe(
    CHECKS,
    Arr.filter(({ slideOnly }) => inJsx || !slideOnly),
  );

  const check = (node: TxtNode, text: string): Promise<void> => {
    const offset = pipe(
      Str.indexOf(text)(getSource(node)),
      Option.getOrElse(() => NO_OFFSET),
    );
    return Effect.runPromise(
      Effect.map(findings(text, checks), (found) => {
        for (const { message, range } of found) {
          const [start, end] = range;
          report(
            node,
            new RuleError(message, { padding: locator.range([start + offset, end + offset]) }),
          );
        }
      }),
    );
  };

  return {
    [Syntax.Paragraph]: (node) => check(node, getSource(node)),
    [Syntax.Header]: (node) => check(node, getSource(node)),
    [Syntax.Str]: (node) => {
      if (inJsx) {
        return check(node, node.value);
      }
      return Promise.resolve();
    },
  };
};

export default rule;
