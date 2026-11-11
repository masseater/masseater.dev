import { CircleHelp, ListTodo, Timer, Undo2 } from "lucide-react";
import type { ReactNode } from "react";

import type { Fact } from "./facts.ts";

const ICONS = { wait: Timer, withdrawn: Undo2, open: CircleHelp, next: ListTodo } as const;

const FactLine = ({ fact }: Readonly<{ fact: Fact }>): ReactNode => {
  const Icon = ICONS[fact.key];
  return (
    <li className="flex items-center gap-3 text-sm">
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <span className="flex-1">{fact.label}</span>
      <span className="tabular-nums">{fact.value}</span>
    </li>
  );
};

export { FactLine };
