import type { ReactNode } from "react";

import type { Example } from "#/entities/technique/model/technique";

import { ExampleFigure } from "./example-figure";
import { ExternalLink } from "./external-link";

const ImageExample = ({
  example,
}: Readonly<{ example: Extract<Example, Readonly<{ kind: "image" }>> }>): ReactNode => (
  <ExampleFigure alt={example.alt} src={example.src}>
    <ExternalLink href={example.credit.href}>{example.credit.text}</ExternalLink>
  </ExampleFigure>
);

export { ImageExample };
