import type { ReactNode } from "react";

import { IMAGE_SEPARATOR, imageCredit } from "#/entities/technique/model/credit";
import type { WikiImage } from "#/entities/technique/model/technique";

import { ExampleFigure } from "./example-figure";
import { ExternalLink } from "./external-link";

const WikiFigure = ({
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

export { WikiFigure };
