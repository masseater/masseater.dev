import type { ReactNode } from "react";

import { FootnotePreview } from "./footnote-preview.tsx";
import type { FootnoteProps } from "./footnote-preview.tsx";

export const FootnoteRef = ({ href, id, label, children }: FootnoteProps): ReactNode => (
  <sup>
    <FootnotePreview href={href} id={id} label={label}>
      {children}
    </FootnotePreview>
  </sup>
);
