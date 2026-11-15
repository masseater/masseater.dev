import type { ReactNode } from "react";

import type { Lead } from "#/entities/interview";

import { LeadSource } from "./lead-source.tsx";

const LeadItem = ({ lead }: Readonly<{ lead: Lead }>): ReactNode => (
  <li className="animate-in fade-in flex flex-col gap-0.5 duration-700">
    <span className="font-medium wrap-anywhere">{lead.topic}</span>
    <span className="text-muted-foreground wrap-anywhere">{lead.detail}</span>
    <LeadSource source={lead.source} />
  </li>
);

export { LeadItem };
