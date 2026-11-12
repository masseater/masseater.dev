import { Array, Effect, Number, Schema, String, pipe } from "effect";

import { judgeAs } from "#shared/agent";

const NO_TOOLS: readonly string[] = [];
const ENOUGH_PROSE = 400;
const LINE_BREAK = "\n";

const Answer = Schema.Struct({ title: Schema.String });

const SYSTEM = `あなたは小説の原稿を読む担当編集です。書き手はまだ題名を付けていません。
本文に合う仮の題名を一つ付けてください。煽り文句や副題を付けず、本文の言葉づかいに寄せてください。`;

const proseLength = (prose: readonly string[]): number =>
  pipe(prose, Array.map(String.length), Number.sumAll);

/** @internal */
const proposeTitle = Effect.fn("proposeTitle")(function* proposeTitle(prose: readonly string[]) {
  if (proseLength(prose) < ENOUGH_PROSE) {
    return String.empty;
  }
  const { title } = yield* judgeAs(Answer)({
    system: SYSTEM,
    prompt: pipe(prose, Array.join(LINE_BREAK)),
    tools: NO_TOOLS,
  });
  return String.trim(title);
});

export { proposeTitle };
