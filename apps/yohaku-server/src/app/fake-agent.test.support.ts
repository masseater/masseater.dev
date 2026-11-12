import { Array, Effect, Layer, Option, Ref, Stream, String, pipe } from "effect";

import { Agent } from "#shared/agent";
import type { Instruction } from "#shared/agent";

const DRAFT = ["彩葉の声に、", "かぐやの顔のまま振り向いてしまった。"] as const;
const TITLE = "保管庫のアバター";
const LINE = /^(?<index>\d+): (?<text>.*)$/u;
const MEMO_SPACE = "　";
const LINE_BREAK = "\n";
const UNKNOWN_WHEN = Option.getOrNull(Option.none<string>());

const kindOf = (text: string): string => {
  if (String.includes(MEMO_SPACE)(text)) {
    return "memo";
  }
  if (String.startsWith("ネタ")(text)) {
    return "idea";
  }
  return "prose";
};

const judgedLine = (
  line: string,
): Option.Option<{ readonly index: number; readonly kind: string }> =>
  pipe(
    line,
    String.match(LINE),
    Option.flatMap(({ groups }) => Option.fromUndefinedOr(groups)),
    Option.map(({ index, text }) => ({
      index: globalThis.Number(index),
      kind: kindOf(
        pipe(
          Option.fromUndefinedOr(text),
          Option.getOrElse(() => String.empty),
        ),
      ),
    })),
  );

const classified = (prompt: string): unknown => ({
  kinds: pipe(prompt, String.split(LINE_BREAK), Array.map(judgedLine), Array.getSomes),
});

const extracted = {
  label: "pixiv 百科事典 ヤチヨ",
  facts: [
    {
      kind: "voice",
      subject: "ヤチヨ",
      body: "一人称は「わたし」。語尾をのばす",
      when: UNKNOWN_WHEN,
    },
    { kind: "event", subject: "ヤチヨ", body: "8000 年待って彩葉と再会する", when: "再会" },
  ],
};

const answerFor = ({ system, prompt }: Instruction): unknown => {
  if (String.includes("番号つきの行")(system)) {
    return classified(prompt);
  }
  if (String.includes("題名")(system)) {
    return { title: TITLE };
  }
  return extracted;
};

const fakeAgent = (calls: Ref.Ref<readonly Instruction[]>): Layer.Layer<Agent> =>
  Layer.succeed(
    Agent,
    Agent.of({
      write: (instruction) =>
        Stream.fromEffect(Ref.update(calls, Array.append(instruction))).pipe(
          Stream.flatMap(() => Stream.fromIterable(DRAFT)),
        ),
      judge: (judgement) =>
        Ref.update(calls, Array.append<Instruction>(judgement)).pipe(
          Effect.as(answerFor(judgement)),
        ),
    }),
  );

export { DRAFT, TITLE, fakeAgent };
