import type { Run } from "@ocr-decide/measurements/schema";
import { INVOICE_FIELDS } from "@r_masseater/ocr-decide";
import { Array as Arr, Number as Num, Option, Record as Rec, pipe } from "effect";

import type { Outcome } from "./outcome.ts";
import { CONDITIONS, KINDS, truthOf } from "./sample.ts";
import type { Document } from "./sample.ts";
import { isCorrect } from "./score.ts";
import type { FieldId } from "./score.ts";

const KIND_LABELS = { receipt: "レシート", invoice: "請求書" } as const;

const CONDITION_LABELS = { clean: "", degraded: "（劣化）" } as const;

const NONE = 0;

const FIELD_IDS: readonly FieldId[] = pipe(
  INVOICE_FIELDS,
  Arr.map(({ id }) => id),
);

const GROUPS = pipe(
  KINDS,
  Arr.flatMap((kind) =>
    pipe(
      CONDITIONS,
      Arr.map((condition) => ({
        id: `${kind}-${condition}`,
        label: `${KIND_LABELS[kind]}${CONDITION_LABELS[condition]}`,
      })),
    ),
  ),
);

const groupOf = (document: Document): string => `${document.kind}-${document.condition}`;

const rate = (hits: readonly boolean[]): number => {
  if (hits.length === NONE) {
    return NONE;
  }
  return pipe(hits, Arr.filter(Boolean)).length / hits.length;
};

const average = (values: readonly number[]): number => {
  if (values.length === NONE) {
    return NONE;
  }
  return Num.sumAll(values) / values.length;
};

const fieldHit = (outcome: Outcome, document: Document, field: FieldId): boolean => {
  if (outcome.extraction.status === "failed") {
    return false;
  }
  return Option.fromNullishOr(outcome.extraction.value.values[field]).pipe(
    Option.exists((value) => isCorrect({ field, value, truth: truthOf({ document, field }) })),
  );
};

const documentOf = (documents: readonly Document[], id: string): Option.Option<Document> =>
  Arr.findFirst(documents, (document) => document.id === id);

const hitsOf = (
  outcomes: readonly Outcome[],
  documents: readonly Document[],
  fieldIds: readonly FieldId[],
): readonly boolean[] =>
  pipe(
    outcomes,
    Arr.flatMap((outcome) =>
      documentOf(documents, outcome.id).pipe(
        Option.match({
          onNone: () =>
            pipe(
              fieldIds,
              Arr.map(() => false),
            ),
          onSome: (document) =>
            pipe(
              fieldIds,
              Arr.map((field) => fieldHit(outcome, document, field)),
            ),
        }),
      ),
    ),
  );

const groupRates = (
  outcomes: readonly Outcome[],
  documents: readonly Document[],
): Readonly<Record<string, number>> =>
  Rec.fromEntries(
    pipe(
      GROUPS,
      Arr.map(({ id }) => {
        const members = pipe(
          outcomes,
          Arr.filter((outcome) =>
            documentOf(documents, outcome.id).pipe(Option.exists((doc) => groupOf(doc) === id)),
          ),
        );
        return [id, rate(hitsOf(members, documents, FIELD_IDS))];
      }),
    ),
  );

const runOf = (outcomes: readonly [Outcome, ...Outcome[]], documents: readonly Document[]): Run => {
  const [first] = outcomes;
  return {
    method: first.method,
    model: first.model,
    label: first.label,
    accuracy: rate(hitsOf(outcomes, documents, FIELD_IDS)),
    byField: Rec.fromEntries(
      pipe(
        FIELD_IDS,
        Arr.map((field) => [field, rate(hitsOf(outcomes, documents, [field]))]),
      ),
    ),
    byGroup: groupRates(outcomes, documents),
    secondsPerDocument: average(
      pipe(
        outcomes,
        Arr.map(({ seconds }) => seconds),
      ),
    ),
    usdPerDocument: average(
      pipe(
        outcomes,
        Arr.map(({ costUsd }) => costUsd),
      ),
    ),
    failed: pipe(
      outcomes,
      Arr.filter(({ extraction }) => extraction.status === "failed"),
    ).length,
  };
};

const summarize = ({
  outcomes,
  documents,
}: Readonly<{ outcomes: readonly Outcome[]; documents: readonly Document[] }>): readonly Run[] => {
  const groups = Arr.groupBy(outcomes, ({ method, model }) => `${method} ${model}`);
  return pipe(
    Rec.values(groups),
    Arr.map((group) => runOf(group, documents)),
  );
};

export { GROUPS, summarize };
