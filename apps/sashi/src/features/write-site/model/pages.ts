import { KINDS, kindLabels } from "@masseater.dev/sashi";
import type { Reference } from "@masseater.dev/sashi";
import { Array as Arr, Option, pipe } from "effect";

import { pageHtml } from "./render.ts";
import type { Section } from "./render.ts";

export type Page = Readonly<{ path: string; html: string }>;

const ALL: Section = { path: "/", label: "すべて", kind: Option.none() };

const SECTIONS: readonly Section[] = [
  ALL,
  ...pipe(
    KINDS,
    Arr.map((kind): Section => ({
      path: `/${kind}/`,
      label: kindLabels[kind],
      kind: Option.some(kind),
    })),
  ),
];

const referencesIn =
  (references: readonly Reference[]) =>
  ({ kind }: Section): readonly Reference[] =>
    Option.match(kind, {
      onNone: () => references,
      onSome: (found) =>
        pipe(
          references,
          Arr.filter((reference) => reference.kind === found),
        ),
    });

export const pagesOf = (references: readonly Reference[]): readonly Page[] => {
  const counts = pipe(SECTIONS, Arr.map(referencesIn(references)), Arr.map(Arr.length));
  return pipe(
    SECTIONS,
    Arr.map((current) => ({
      path: current.path,
      html: pageHtml({
        current,
        sections: SECTIONS,
        references: referencesIn(references)(current),
        counts,
      }),
    })),
  );
};
