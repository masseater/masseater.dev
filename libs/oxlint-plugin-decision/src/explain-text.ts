import { Array as Arr, Boolean as Bool, Option, Predicate, Record as Rec, pipe } from "effect";

import { PREFIX } from "./options.ts";
import { toJson } from "./runtime.ts";
import type { Verdict } from "./types.ts";

const DECIMALS = 2;
interface ExplainQuestion {
  readonly id: string;
  readonly question: string;
  readonly probabilities: Readonly<Record<string, number>>;
}

interface Explanation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly rule: string;
  readonly model: string;
  readonly served?: string;
  readonly cutoff: number;
  readonly cached?: boolean;
  readonly durationMs: number;
  readonly state: { readonly chars: number; readonly head: string };
  readonly questions: readonly ExplainQuestion[];
  readonly verdict?: Verdict;
  readonly reported: boolean;
  readonly error?: string;
}
const fixed = (value: number): string => value.toFixed(DECIMALS);

const cachedText = (cached: boolean | undefined): string =>
  Option.match(Option.fromUndefinedOr(cached), {
    onNone: () => "unknown",
    onSome: (hit) => Bool.match(hit, { onTrue: () => "yes", onFalse: () => "no" }),
  });

const probabilitiesText = (probabilities: Readonly<Record<string, number>>): string =>
  Option.match(
    Arr.match(Rec.toEntries(probabilities), {
      onEmpty: () => Option.none<string>(),
      onNonEmpty: (entries) =>
        Option.some(
          pipe(
            entries,
            Arr.map(([label, value]) => `${label}=${fixed(value)}`),
            Arr.join(" "),
          ),
        ),
    }),
    { onNone: () => "(no answer)", onSome: (text) => text },
  );

const verdictText = (explanation: Explanation): string => {
  if (Predicate.isNotUndefined(explanation.error)) {
    return `error: ${explanation.error}`;
  }
  const outcome = Bool.match(explanation.reported, {
    onTrue: () => "reported",
    onFalse: () => "not reported",
  });
  const cutoff = `cutoff ${fixed(explanation.cutoff)}`;
  return Option.match(Option.fromUndefinedOr(explanation.verdict), {
    onNone: () => `no verdict, ${cutoff}, ${outcome}`,
    onSome: ({ answer, probability }) => `${answer} ${fixed(probability)}, ${cutoff}, ${outcome}`,
  });
};

const servedText = (served: string | undefined): string =>
  Option.match(Option.fromUndefinedOr(served), {
    onNone: () => "",
    onSome: (id) => ` (served ${id})`,
  });

const asText = (explanation: Explanation): string =>
  pipe(
    [
      `${PREFIX} explain: ${explanation.file}:${String(explanation.line)}:${String(explanation.column)} [${explanation.rule}] ${explanation.model}${servedText(explanation.served)} cached=${cachedText(explanation.cached)} ${String(explanation.durationMs)}ms`,
      `  state: ${String(explanation.state.chars)} chars ${toJson(explanation.state.head)}`,
      ...pipe(
        explanation.questions,
        Arr.map(
          ({ id, question, probabilities }) =>
            `  ${id}: ${probabilitiesText(probabilities)}\n    ${question}`,
        ),
      ),
      `  verdict: ${verdictText(explanation)}`,
    ],
    Arr.join("\n"),
  );

export { asText };
export type { ExplainQuestion, Explanation };
