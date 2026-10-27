import type { ReactNode } from "react";

import { EntryBody } from "#/entities/entry";
import type { Entry } from "#/entities/entry";

const EntryProse = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <div className="prose prose-zinc prose-headings:font-display prose-headings:font-normal prose-headings:tracking-tight prose-headings:scroll-mt-8 prose-a:font-normal prose-a:underline-offset-4 prose-a:decoration-foreground/30 hover:prose-a:decoration-foreground prose-a:transition-colors prose-code:rounded-md prose-code:bg-foreground/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-2xl max-w-none leading-loose *:first:mt-0 *:last:mb-0">
    <EntryBody entry={entry} />
  </div>
);

export { EntryProse };
