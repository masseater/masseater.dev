import { Array as Arr } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { statementOf } from "#/entities/watashi/index.ts";
import type { TraitValue } from "#/entities/watashi/index.ts";
import { Row, TagList } from "#/shared/ui/index.ts";

import { TraitWhy } from "./trait-why";

const GLOBAL = "global";

const SUPPORTS = "根拠";

const scopeTags = (trait: TraitValue): readonly string[] =>
  Arr.filter([trait.scope], (scope) => scope !== GLOBAL);

export const TraitRow = ({ trait }: Readonly<{ trait: TraitValue }>): ReactNode => {
  const tags = useMemo(() => scopeTags(trait), [trait]);
  return (
    <Row lead={`${SUPPORTS} ${String(trait.supports)}`}>
      <p className="text-foreground text-sm leading-relaxed">{statementOf(trait)}</p>
      <TraitWhy trait={trait} />
      <TagList tags={tags} />
    </Row>
  );
};
