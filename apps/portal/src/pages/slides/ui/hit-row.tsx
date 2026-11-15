import type { ReactNode } from "react";

import { excerpt, pageUrl } from "#/entities/slide";
import type { HitValue } from "#/entities/slide";
import { Row } from "#/shared/ui";

export const HitRow = ({ hit }: Readonly<{ hit: HitValue }>): ReactNode => (
  <Row lead={`${String(hit.page)} / ${String(hit.pages)}`}>
    <a className="text-link font-bold underline underline-offset-3" href={pageUrl(hit)}>
      {hit.title}
    </a>
    <p className="text-muted-foreground text-sm leading-relaxed">{excerpt(hit.text)}</p>
  </Row>
);
