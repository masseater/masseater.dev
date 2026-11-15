import type { ReactNode } from "react";

import { FootnotePreview } from "./footnote-preview";
import type { FootnoteProps } from "./footnote-preview";

export const FootnoteRef = ({ href, id, label, children }: FootnoteProps): ReactNode => (
  <sup>
    <FootnotePreview href={href} id={id} label={label}>
      {children}
    </FootnotePreview>
  </sup>
);
