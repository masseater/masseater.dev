import type { ReactNode } from "react";

import type { Example } from "#/entities/technique/model/technique.ts";

import { ExampleFigure } from "./example-figure.tsx";
import { ExternalLink } from "./external-link.tsx";

export const ImageExample = ({
  example,
}: Readonly<{ example: Extract<Example, Readonly<{ kind: "image" }>> }>): ReactNode => (
  <ExampleFigure alt={example.alt} src={example.src}>
    <ExternalLink href={example.credit.href}>{example.credit.text}</ExternalLink>
  </ExampleFigure>
);
