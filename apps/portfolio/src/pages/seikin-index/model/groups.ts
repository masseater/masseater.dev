import { Array as Arr, Record as Rec, pipe } from "effect";

import { techniqueList } from "#/entities/technique";
import type { Article, Technique } from "#/entities/technique";

export type Group = Readonly<{ name: string; techniques: readonly Technique[] }>;

export const groupsOf = (article: Article): readonly Group[] =>
  pipe(
    techniqueList,
    Arr.filter((technique) => Arr.headNonEmpty(technique.origins).article === article),
    Arr.groupBy((technique) => Arr.headNonEmpty(technique.origins).group),
    Rec.toEntries,
    Arr.map(([name, techniques]) => ({ name, techniques })),
  );
