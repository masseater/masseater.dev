import { Link } from "@tanstack/react-router";
import { String as Str } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { ProjectValue } from "#/entities/watashi";
import { shownTime } from "#/shared/model";

const TEXT = { memos: "メモ", latest: "更新" } as const;

const DAY_START = 0;

const DAY_END = 10;

export const ProjectLine = ({ project }: Readonly<{ project: ProjectValue }>): ReactNode => {
  const search = useMemo(() => ({ project: project.project }), [project.project]);
  const day = Str.slice(DAY_START, DAY_END)(shownTime(project.updatedAt));
  return (
    <li className="flex items-baseline gap-3 py-2 text-sm">
      <Link
        className="text-link min-w-0 flex-1 truncate underline underline-offset-3"
        search={search}
        to="/memos"
      >
        {project.project}
      </Link>
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
        {`${TEXT.memos} ${String(project.memos)} ・ ${TEXT.latest} ${day}`}
      </span>
    </li>
  );
};
