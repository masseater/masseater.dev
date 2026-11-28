import {
  GenerationTask,
  createRegistry,
  defineExtension,
  defineTool,
  hook,
  section,
} from "@earendil-works/pi-durable";
import type { Cursor, Extension, Registry } from "@earendil-works/pi-durable";
import { Array as Arr, Effect, Number as Num, Option, Result, Schema, pipe } from "effect";

import { AnalysisResult } from "#/entities/trait/index.ts";
import type { AnalysisResultValue } from "#/entities/trait/index.ts";
import { NUDGE, RECORD_TOOL, needsNudge } from "#/features/build-traits/model/analyst-nudge.ts";

export const TRAIT_MODEL = "@cf/thinkingmachines/inkling-2-small";

const INSTRUCTIONS = Arr.join(
  [
    "You read notes and records written by one person, the owner, and link them to the owner's traits.",
    "The user message is JSON with `sources` and `traits`. Each source lists the refs of the traits it may concern in `candidates`.",
    `Always call \`${RECORD_TOOL}\` exactly once, then reply with the single word done. When the sources show nothing, call it with an empty \`observations\` list.`,
    "For each trait a source shows, record one observation: `supports` or `contradicts` for a candidate it confirms or denies, `replace` when the owner changed a candidate trait, and `new` when no candidate fits.",
    "Use only the trait refs listed in that source's `candidates`. Copy each quote verbatim from the source text.",
    "Write every statement and why in English, even when the source is Japanese.",
    "Add no observation for a source that says nothing about the owner's rules, tastes, tools, ways of working, values or background.",
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

export type Transcript = Readonly<{
  result: Option.Option<AnalysisResultValue>;
  inputTokens: number;
  outputTokens: number;
}>;

const Entry = Schema.Struct({ model: Schema.Unknown.pipe(Schema.Array, Schema.optional) });

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

export const readTranscript = (entries: readonly unknown[]): Transcript => {
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

const Part = Schema.Struct({ type: Schema.String, name: Schema.optional(Schema.String) });

const Said = Schema.Struct({
  role: Schema.Literal("assistant"),
  stopReason: Schema.optional(Schema.String),
  errorMessage: Schema.optional(Schema.String),
  content: Schema.Array(Schema.Unknown),
});

const decodePart = Schema.decodeUnknownOption(Part);

const decodeSaid = Schema.decodeUnknownOption(Said);

const checkCall = Schema.decodeUnknownResult(RecordCall);

const labelOf = (part: unknown): string =>
  pipe(
    decodePart(part),
    Option.map((decoded) =>
      pipe(
        Option.fromUndefinedOr(decoded.name),
        Option.match({ onNone: () => decoded.type, onSome: (name) => `${decoded.type}:${name}` }),
      ),
    ),
    Option.getOrElse(() => "unknown"),
  );

const rejectionOf = (part: unknown): Option.Option<string> =>
  pipe(
    decodePart(part),
    Option.filter((decoded) => decoded.name === RECORD_TOOL),
    Option.flatMap(() => Result.getFailure(checkCall(part))),
    Option.map((error) => error.message),
  );

const describe = (said: typeof Said.Type): string =>
  Arr.join(
    [
      `stop=${Option.getOrElse(Option.fromUndefinedOr(said.stopReason), () => "none")}`,
      `parts=${pipe(said.content, Arr.map(labelOf), Arr.join(","))}`,
      ...Option.toArray(Option.fromUndefinedOr(said.errorMessage)),
      ...pipe(said.content, Arr.map(rejectionOf), Arr.getSomes),
    ],
    " ",
  );

const lastSaid = (entries: readonly unknown[]): string =>
  pipe(
    entries,
    Arr.flatMap(messagesOf),
    Arr.map((message) => decodeSaid(message)),
    Arr.getSomes,
    Arr.last,
    Option.match({
      onNone: () => `no assistant message in ${String(entries.length)} entries`,
      onSome: describe,
    }),
  );

export const missingCallText = ({
  outcome,
  entries,
}: Readonly<{ outcome: string; entries: readonly unknown[] }>): string =>
  `no ${RECORD_TOOL} call (${outcome}): ${lastSaid(entries)}`;

const RECENT = 20;

const newestFirstOf = (entries: readonly unknown[]): readonly unknown[] =>
  pipe(
    entries,
    Arr.flatMap((entry) => Arr.reverse(messagesOf(entry))),
  );

const FROM_NEWEST = Option.getOrUndefined(Option.none<Cursor>());

const NUDGE_DECISION: Readonly<{ kind: "continue"; continue: string }> = {
  kind: "continue",
  continue: NUDGE,
};

const nudgeOf = (needed: boolean): Option.Option<typeof NUDGE_DECISION> =>
  pipe(
    Option.some(NUDGE_DECISION),
    Option.filter(() => needed),
  );

const nudgeHook = hook(GenerationTask, {
  onYield: (answer, api, context) =>
    Effect.runPromise(
      Effect.promise(() => api.entries({ order: "descending" }, RECENT, FROM_NEWEST, context)).pipe(
        Effect.map((page) =>
          nudgeOf(needsNudge({ answer, newestFirst: newestFirstOf(page.items) })),
        ),
        Effect.map(Option.getOrUndefined),
      ),
    ),
});

const traitExtension = (): Extension =>
  defineExtension({
    name: "watashi.traits",
    sections: [section("trait_rules", () => INSTRUCTIONS, { tag: false })],
    tools: [recordTool],
    hooks: [nudgeHook],
  });

export const traitRegistry = (): Registry => {
  const registry = createRegistry();
  registry.install(traitExtension());
  return registry;
};
