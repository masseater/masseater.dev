import type { ReactNode } from "react";

import { IMAGE_SEPARATOR, imageCredit } from "#/entities/technique/model/credit.ts";
import type { WikiImage } from "#/entities/technique/model/technique.ts";

import { ExampleFigure } from "./example-figure.tsx";
import { ExternalLink } from "./external-link.tsx";

export const WikiFigure = ({
  href,
  label,
  image,
}: Readonly<{ href: string; label: string; image: WikiImage }>): ReactNode => (
  <ExampleFigure alt={label} src={image.src}>
    <ExternalLink href={href}>{label}</ExternalLink>
    {IMAGE_SEPARATOR}
    <ExternalLink href={image.file}>{imageCredit(image)}</ExternalLink>
  </ExampleFigure>
);
