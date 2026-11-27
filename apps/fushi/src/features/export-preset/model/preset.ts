import { StyleRulesSchema } from "@r_masseater/i68/habits";
import type { HabitKind, HabitRule, StyleRules } from "@r_masseater/i68/habits";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import type { Judgment, Library, Style } from "#/entities/library/index.ts";
import { savePresetText } from "#/shared/api/index.ts";
import type { Verdict } from "#/shared/config/index.ts";
import { runtime } from "#/shared/lib/index.ts";

const KINDS: Readonly<Record<Verdict, Option.Option<HabitKind>>> = {
  keep: Option.some("keep"),
  fix: Option.some("fix"),
  suggest: Option.some("suggest"),
  reject: Option.none(),
};

const aimName =
  (library: Library) =>
  (id: string): string =>
    pipe(
      library.aims,
      Arr.findFirst((aim) => aim.id === id),
      Option.match({ onNone: () => id, onSome: (aim) => aim.name }),
    );

const ruleOf =
  (library: Library) =>
  (judgment: Judgment): Option.Option<HabitRule> =>
    Option.all({ kind: KINDS[judgment.verdict], aim: Option.fromNullishOr(judgment.aim) }).pipe(
      Option.map(({ kind, aim }) => ({
        habit: judgment.subject,
        kind,
        aim: aimName(library)(aim),
      })),
    );

const rulesOf =
  (library: Library) =>
  (style: Style): StyleRules => ({
    name: style.name,
    habits: pipe(
      library.judgments,
      Arr.filter((judgment) => judgment.style === style.id),
      Arr.map(ruleOf(library)),
      Arr.getSomes,
    ),
  });

const encode = Schema.encodeEffect(Schema.fromJsonString(StyleRulesSchema));

export type Exported = Readonly<{ library: Library; style: Style }>;

/** @internal */
export const exportAtom = runtime.fn(({ library, style }: Exported) =>
  encode(rulesOf(library)(style)).pipe(
    Effect.flatMap((json) => savePresetText({ name: style.name, json })),
  ),
);
