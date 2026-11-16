import type { ReactNode } from "react";

import { CardHeader } from "./card-header.tsx";
import { Card } from "./card.tsx";

export const Section = ({
  children,
  meta,
  title,
}: Readonly<{ children: ReactNode; meta?: string | undefined; title: string }>): ReactNode => (
  <Card>
    <CardHeader meta={meta} title={title} />
    {children}
  </Card>
);
