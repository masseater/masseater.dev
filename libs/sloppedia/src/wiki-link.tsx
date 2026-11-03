import { Match, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { SloppediaConfig, Target } from "./config.ts";

const LINK_CLASS = "text-wiki-link hover:underline";

const hrefOf = (config: SloppediaConfig, target: Target): string =>
  pipe(
    Match.value(target),
    Match.discriminatorsExhaustive("page")({
      main: () => config.basePath,
      categories: () => `${config.basePath}/categories`,
      category: ({ name }) => `${config.basePath}/categories#${encodeURIComponent(name)}`,
      article: ({ slug }) => `${config.basePath}/${encodeURIComponent(slug)}`,
      home: () => Option.match(config.home, { onNone: () => "/", onSome: ({ href }) => href }),
    }),
  );

const WikiLink = ({
  config,
  target,
  className = LINK_CLASS,
  children,
}: Readonly<{
  config: SloppediaConfig;
  target: Target;
  className?: string;
  children: ReactNode;
}>): ReactNode => {
  const { Link } = config;
  return (
    <Link className={className} href={hrefOf(config, target)} target={target}>
      {children}
    </Link>
  );
};

export { WikiLink };
