import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import { Array, Effect, Option, Stream, String, pipe } from "effect";

import { Agent } from "#shared/agent";
import type { AgentFailed } from "#shared/agent";

const LINE_BREAK = "\n";

interface Context {
  readonly paragraphs: readonly (typeof Paragraph.Type)[];
  readonly prose: readonly string[];
  readonly facts: readonly Readonly<{
    kind: string;
    subject: string;
    body: string;
    at: string | null;
    label: string;
  }>[];
}

const STYLE_RULES = `守ること:
- 書き手のこれまでの本文の文体・人称・語彙・文の長さに合わせる。
- 感情を「嬉しかった」「胸が温かくなった」のように説明しない。動作・視線・台詞・間で見せる。
- 「〜のような」「まるで〜」の飾った比喩、「静寂」「紡ぐ」「刻む」のような大げさな語を使わない。
- 人物の口調は資料の voice に従う。資料にない設定を足さない。
- 出力は本文の文章だけにする。前置き・説明・かっこ書きの注釈を付けない。`;

const DRAFT_SYSTEM = `あなたは書き手の代わりに小説の一節を書く書き手の分身です。
書き手が残したメモを、直前までの本文に続く本文にしてください。メモに書かれていないことは書き足さない。
${STYLE_RULES}`;

const REWRITE_SYSTEM = `あなたは書き手の文章を直す担当編集です。
指示された箇所だけを書き直し、置き換える文章だけを出力してください。前後の文はそのまま残るので繰り返さない。
${STYLE_RULES}`;

const factLine = ({ kind, subject, body, at, label }: Context["facts"][number]): string =>
  pipe(
    Option.fromNullOr(at),
    Option.match({
      onNone: () => `- [${kind}] ${subject}: ${body}（${label}）`,
      onSome: (when) => `- [${kind}] ${subject}（${when}）: ${body}（${label}）`,
    }),
  );

const proseBefore = (context: Context, paragraphId: string): string =>
  pipe(
    context.paragraphs,
    Array.takeWhile(({ id }) => id !== paragraphId),
    Array.map(({ text }) => text),
    Array.intersection(context.prose),
    Array.join(LINE_BREAK),
  );

const factsSection = (facts: Context["facts"]): string =>
  pipe(facts, Array.map(factLine), Array.join(LINE_BREAK), (lines) => `資料:${LINE_BREAK}${lines}`);

const written = (system: string, prompt: string): Stream.Stream<string, AgentFailed, Agent> =>
  Stream.unwrap(Agent.pipe(Effect.map((agent) => agent.write({ system, prompt }))));

const draftFromMemo = ({
  context,
  memo,
}: Readonly<{ context: Context; memo: typeof Paragraph.Type }>): Stream.Stream<
  string,
  AgentFailed,
  Agent
> =>
  written(
    DRAFT_SYSTEM,
    `${factsSection(context.facts)}

直前までの本文:
${proseBefore(context, memo.id)}

メモ:
${memo.text}`,
  );

const rewriteSpan = ({
  context,
  paragraph,
  from,
  to,
  problem,
}: Readonly<{
  context: Context;
  paragraph: typeof Paragraph.Type;
  from: number;
  to: number;
  problem: string;
}>): Stream.Stream<string, AgentFailed, Agent> =>
  written(
    REWRITE_SYSTEM,
    `${factsSection(context.facts)}

直前までの本文:
${proseBefore(context, paragraph.id)}

段落:
${paragraph.text}

書き直す箇所（${problem}）:
${pipe(paragraph.text, String.slice(from, to))}`,
  );

export { draftFromMemo, rewriteSpan };
export type { Context };
