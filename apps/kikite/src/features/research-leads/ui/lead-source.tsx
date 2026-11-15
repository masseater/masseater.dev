import { Option, pipe } from "effect";
import type { ReactNode } from "react";

const MEMORY = "memory";
const MEMORY_LABEL = "前の会話から";
const WEB = new Set(["http:", "https:"]);

const hostOf = (source: string): Option.Option<string> =>
  pipe(
    Option.liftPredicate(source, (value) => URL.canParse(value)),
    Option.map((value) => new URL(value)),
    Option.filter(({ protocol }) => WEB.has(protocol)),
    Option.map(({ host }) => host),
  );

export const LeadSource = ({ source }: Readonly<{ source: string }>): ReactNode => {
  if (source === MEMORY) {
    return <span className="text-muted-foreground/70 text-xs">{MEMORY_LABEL}</span>;
  }
  const host = hostOf(source);
  if (Option.isNone(host)) {
    return false;
  }
  return (
    <a
      href={source}
      target="_blank"
      rel="noreferrer"
      className="text-muted-foreground/70 hover:text-foreground w-fit text-xs underline underline-offset-2"
    >
      {host.value}
    </a>
  );
};
