import { Array as Arr, pipe } from "effect";

import { techniqueList } from "#/entities/technique";
import { hasEffect } from "#/features/dance-stage";

const READY_CLASS = "hover:underline";
const PENDING_CLASS = "text-muted-foreground hover:underline";

const reproduced = pipe(
  techniqueList,
  Arr.filter(({ slug }) => hasEffect(slug)),
  Arr.length,
);

const progressText = `${String(techniqueList.length)} 手法のうち ${String(reproduced)} 手法を再現済み。薄い字の手法は準備中。`;

const linkClassOf = (slug: string): string => {
  if (hasEffect(slug)) {
    return READY_CLASS;
  }
  return PENDING_CLASS;
};

export { linkClassOf, progressText };
