import { createRegistry, defineExtension, defineTool, section } from "@earendil-works/pi-durable";
import type { Extension, Registry } from "@earendil-works/pi-durable";
import { Array as Arr, Number as Num, Option, Schema, pipe } from "effect";

import { AnalysisResult } from "#/features/mcp/model/trait-analysis";
import type { AnalysisResultValue } from "#/features/mcp/model/trait-analysis";

const TRAIT_MODEL = "@cf/zai-org/glm-5.3-flash";

const RECORD_TOOL = "record_observations";

const INSTRUCTIONS = Arr.join(
  [
    "You read notes and records written by one person, the owner, and link them to the owner's traits.",
    "The user message is JSON with `sources` and `traits`. Each source lists the refs of the traits it may concern in `candidates`.",
    `Call \`${RECORD_TOOL}\` exactly once with every observation you find, then reply with the single word done.`,
    "For each trait a source shows, record one observation: `supports` or `contradicts` for a candidate it confirms or denies, `replace` when the owner changed a candidate trait, and `new` when no candidate fits.",
    "Use only the trait refs listed in that source's `candidates`. Copy each quote verbatim from the source text.",
    "Write every statement and why in English, even when the source is Japanese.",
    "Record nothing for a source that says nothing about the owner's rules, tastes, tools, ways of working, values or background.",
  ],
  "\n",
);

const recordTool = defineTool({
  name: RECORD_TOOL,
  description: "Record the observations found in the sources. Call it once with all of them.",
  parameters: Schema.toJsonSchemaDocument(AnalysisResult).schema,
  replay: "safe",
  execute: () => Promise.resolve({ output: [{ type: "text", text: "recorded" }] }),
});

const traitExtension = (): Extension =>
  defineExtension({
    name: "watashi.traits",
    sections: [section("trait_rules", () => INSTRUCTIONS, { tag: false })],
    tools: [recordTool],
  });

const traitRegistry = (): Registry => {
  const registry = createRegistry();
  registry.install(traitExtension());
  return registry;
};

const Turn = Schema.Struct({
  role: Schema.Literal("assistant"),
  content: Schema.Array(Schema.Unknown),
  usage: Schema.Struct({ input: Schema.Finite, output: Schema.Finite }),
});

const RecordCall = Schema.Struct({
  type: Schema.Literal("toolCall"),
  name: Schema.Literal(RECORD_TOOL),
  arguments: AnalysisResult,
});

type Transcript = Readonly<{
  result: Option.Option<AnalysisResultValue>;
  inputTokens: number;
  outputTokens: number;
}>;

const Entry = Schema.Struct({ model: Schema.optional(Schema.Array(Schema.Unknown)) });

const decodeEntry = Schema.decodeUnknownOption(Entry);

const decodeTurn = Schema.decodeUnknownOption(Turn);

const decodeCall = Schema.decodeUnknownOption(RecordCall);

const messagesOf = (entry: unknown): readonly unknown[] =>
  pipe(
    decodeEntry(entry),
    Option.flatMap((decoded) => Option.fromUndefinedOr(decoded.model)),
    Option.getOrElse(Arr.empty),
  );

const turnsOf = (entries: readonly unknown[]): readonly (typeof Turn.Type)[] =>
  pipe(
    entries,
    Arr.flatMap(messagesOf),
    Arr.map((message) => decodeTurn(message)),
    Arr.getSomes,
  );

const tokensOf = (
  turns: readonly (typeof Turn.Type)[],
  side: keyof (typeof Turn.Type)["usage"],
): number =>
  pipe(
    turns,
    Arr.map((turn) => turn.usage[side]),
    Num.sumAll,
  );

const readTranscript = (entries: readonly unknown[]): Transcript => {
  const turns = turnsOf(entries);
  return {
    result: pipe(
      turns,
      Arr.flatMap((turn) => turn.content),
      Arr.map((part) => decodeCall(part)),
      Arr.getSomes,
      Arr.last,
      Option.map((call) => call.arguments),
    ),
    inputTokens: tokensOf(turns, "input"),
    outputTokens: tokensOf(turns, "output"),
  };
};

export { RECORD_TOOL, TRAIT_MODEL, readTranscript, traitRegistry };
export type { Transcript };
