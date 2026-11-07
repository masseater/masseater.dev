import { useCallback } from "react";
import type { ReactNode } from "react";

import { NO_FOCUS, useSetFocus } from "#/pages/inspect/model/draft";
import { formatPercent } from "#/pages/inspect/model/format";
import type { Answer, Row } from "#/pages/inspect/model/trace";

import { ProbeBar } from "./probe-bar";

const DEPTH_INDENT = ["pl-0", "pl-3", "pl-6", "pl-9", "pl-12", "pl-15", "pl-18", "pl-21"];

const DEEPEST = DEPTH_INDENT.length - DEPTH_INDENT.indexOf("pl-3");

const probabilityOf = (answer: Answer): string => {
  if (answer.status === "answered") {
    return formatPercent(answer.probability);
  }
  return "…";
};

const millisOf = (answer: Answer): string => {
  if (answer.status === "answered") {
    return `${Math.round(answer.millis)}ms`;
  }
  return "";
};

const TraceRow = ({
  row,
  excerpt,
  total,
}: Readonly<{ row: Row; excerpt: string; total: number }>): ReactNode => {
  const setFocus = useSetFocus();
  const focus = useCallback(() => {
    setFocus({ status: "probe", id: row.id });
  }, [setFocus, row.id]);
  const blur = useCallback(() => {
    setFocus(NO_FOCUS);
  }, [setFocus]);
  return (
    <li>
      <button
        type="button"
        className="hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-2 rounded px-1 py-0.5 text-left font-mono text-xs outline-none"
        onMouseEnter={focus}
        onMouseLeave={blur}
        onFocus={focus}
        onBlur={blur}
      >
        <span className="text-muted-foreground w-8 shrink-0">{`#${row.id}`}</span>
        <span className={`min-w-0 flex-1 truncate ${DEPTH_INDENT[Math.min(row.depth, DEEPEST)]}`}>
          {excerpt}
        </span>
        <ProbeBar row={row} total={total} />
        <span className="w-14 shrink-0 text-right">{probabilityOf(row.answer)}</span>
        <span className="text-muted-foreground w-14 shrink-0 text-right">
          {millisOf(row.answer)}
        </span>
      </button>
    </li>
  );
};

export { TraceRow };
