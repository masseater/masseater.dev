import { Button } from "@masseater.dev/ui/button";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { WeeksSearchValue } from "#/entities/watashi/index.ts";
import { SearchField, SelectField } from "#/shared/ui/index.ts";

const TEXT = {
  search: "振り返りを探す",
  project: "プロジェクト",
  all: "すべてのプロジェクト",
  apply: "絞り込む",
} as const;

const ACTION = "/weeks";

export const WeeksToolbar = ({
  projects,
  search,
}: Readonly<{ projects: readonly string[]; search: WeeksSearchValue }>): ReactNode => {
  const choices = useMemo(
    () =>
      pipe(
        projects,
        Arr.map((project) => ({ value: project, label: project })),
      ),
    [projects],
  );
  const keptProject = useMemo(
    () => Rec.getSomes({ project: Option.fromUndefinedOr(search.project) }),
    [search.project],
  );
  return (
    <div className="flex flex-wrap items-end gap-3">
      <SearchField
        action={ACTION}
        kept={keptProject}
        label={TEXT.search}
        value={search.keyword ?? ""}
      />
      <form action={ACTION} className="flex items-end gap-2" method="get">
        <input name="keyword" type="hidden" value={search.keyword ?? ""} />
        <SelectField
          all={TEXT.all}
          choices={choices}
          label={TEXT.project}
          name="project"
          value={search.project ?? ""}
        />
        <Button type="submit" variant="outline">
          {TEXT.apply}
        </Button>
      </form>
    </div>
  );
};
