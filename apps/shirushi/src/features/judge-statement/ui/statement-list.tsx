import type { Statement } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, Predicate, pipe } from "effect";
import type { ReactNode } from "react";

import { useStatements } from "#/entities/taste/index.ts";
import { scoreOf } from "#/features/judge-statement/model/score.ts";
import { doneLast } from "#/shared/lib/index.ts";

import { StatementItem } from "./statement-item.tsx";

const judged = ({ judgement }: Statement): boolean => Predicate.isNotNull(judgement);

const EMPTY = "見立てはまだありません";

export const StatementList = (): ReactNode => {
  const statements = useStatements();
  if (!Arr.isReadonlyArrayNonEmpty(statements)) {
    return <p className="text-muted-foreground py-6 text-center text-sm">{EMPTY}</p>;
  }
  return (
    <div className="grid">
      <p className="text-muted-foreground pt-2 text-xs tabular-nums">{scoreOf(statements)}</p>
      <ul className="divide-border grid divide-y">
        {pipe(
          doneLast(judged)(statements),
          Arr.map((statement) => <StatementItem key={statement.id} statement={statement} />),
        )}
      </ul>
    </div>
  );
};
