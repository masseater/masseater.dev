import { Link } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useCredentials } from "#/pages/home/api/home-query.ts";
import { Card, CardHeader } from "#/shared/ui/index.ts";

import { AttentionList } from "./attention-list";

const TEXT = {
  title: "要対応",
  clear: "対応が必要なものはありません",
  all: "認証情報をすべて見る",
} as const;

export const AttentionCard = (): ReactNode => {
  const missing = pipe(
    useCredentials(),
    Arr.filter((state) => state.status === "missing"),
  );
  return (
    <Card>
      <CardHeader title={TEXT.title}>
        <Link className="text-link text-sm underline underline-offset-3" to="/credentials">
          {TEXT.all}
        </Link>
      </CardHeader>
      {Arr.isReadonlyArrayEmpty(missing) && (
        <p className="text-muted-foreground text-sm">{TEXT.clear}</p>
      )}
      <AttentionList label={TEXT.title} states={missing} />
    </Card>
  );
};
