"use client";

import { Input } from "@masseater.dev/web-ui";
import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { summary } from "#/pages/leaderboard/model/summary";
import {
  TOP_COUNT,
  useQuery,
  useQueryChange,
  useScope,
  useScopeChange,
} from "#/pages/leaderboard/model/view";
import { ToggleGroup } from "#/shared/ui/toggle-group";
import { ToggleGroupItem } from "#/shared/ui/toggle-group-item";

const TOTAL = summary.models.length;

const ModelFilter = (): ReactNode => {
  const handleQueryChange = useQueryChange();
  const handleScopeChange = useScopeChange();
  return (
    <section
      aria-label="モデルの絞り込み"
      className="bg-background sticky top-0 flex flex-wrap items-center gap-3 py-2"
    >
      <div className="flex w-56 items-center gap-2">
        <Search aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
        <Input
          type="search"
          aria-label="モデル名で絞り込む"
          placeholder="モデル名で絞り込む"
          value={useQuery()}
          onChange={handleQueryChange}
        />
      </div>
      <ToggleGroup label="表示するモデル" value={useScope()} onValueChange={handleScopeChange}>
        <ToggleGroupItem value="top">{`上位 ${TOP_COUNT}`}</ToggleGroupItem>
        <ToggleGroupItem value="all">{`すべて（${TOTAL}）`}</ToggleGroupItem>
      </ToggleGroup>
    </section>
  );
};

export { ModelFilter };
