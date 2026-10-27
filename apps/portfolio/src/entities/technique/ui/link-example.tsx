import { Option } from "effect";
import type { ReactNode } from "react";

import type { Example } from "#/entities/technique/model/technique";

import { ExternalLink } from "./external-link";
import { WikiFigure } from "./wiki-figure";

const LinkExample = ({
  example,
}: Readonly<{ example: Extract<Example, Readonly<{ kind: "link" }>> }>): ReactNode => {
  if (Option.isNone(example.image)) {
    return <ExternalLink href={example.href}>{example.label}</ExternalLink>;
  }
  return <WikiFigure href={example.href} image={example.image.value} label={example.label} />;
};

export { LinkExample };
