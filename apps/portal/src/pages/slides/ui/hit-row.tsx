import type { ReactNode } from "react";

import { excerpt, pageUrl } from "#/entities/slides";
import type { HitValue } from "#/entities/slides";
import { Row } from "#/shared/ui";

const HitRow = ({ hit }: Readonly<{ hit: HitValue }>): ReactNode => (
  <Row lead={`${String(hit.page)} / ${String(hit.pages)}`}>
    <a
      className="font-display hover:text-foreground/70 text-lg font-light transition-colors"
      href={pageUrl(hit)}
    >
      {hit.title}
    </a>
    <p className="text-foreground/70 text-sm leading-relaxed">{excerpt(hit.text)}</p>
  </Row>
);

export { HitRow };
