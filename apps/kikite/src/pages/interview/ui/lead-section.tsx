import { cn } from "@masseater.dev/ui/cn";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useLeads, useResearching } from "#/pages/interview/model/hooks";

import { LeadItem } from "./lead-item.tsx";

const LABEL = "調べたこと";
const RUNNING = "調べています";

const LeadSection = ({ className }: Readonly<{ className?: string }>): ReactNode => {
  const leads = useLeads();
  const running = useResearching().status === "running";
  return (
    <section className={cn("flex flex-col gap-3 px-5 py-4", className)}>
      <h2 className="text-muted-foreground flex items-baseline gap-2 text-xs font-semibold tracking-wider">
        <span className="max-lg:sr-only">{LABEL}</span>
        {running && <span className="animate-pulse font-normal">{RUNNING}</span>}
      </h2>
      <ul className="flex flex-col gap-3 text-sm leading-relaxed">
        {pipe(
          leads,
          Arr.reverse,
          Arr.map((lead) => <LeadItem key={lead.topic} lead={lead} />),
        )}
      </ul>
    </section>
  );
};

export { LeadSection };
