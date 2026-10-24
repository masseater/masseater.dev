"use client";

import { HoverCard } from "radix-ui";
import type { ReactNode } from "react";

import { HoverCardContent } from "#/shared/ui";

type FootnoteProps = Readonly<{ href: string; id: string; label: string; children: ReactNode }>;

const OPEN_DELAY = 150;

const CLOSE_DELAY = 100;

const FootnotePreview = ({ href, id, label, children }: FootnoteProps): ReactNode => (
  <HoverCard.Root closeDelay={CLOSE_DELAY} openDelay={OPEN_DELAY}>
    <HoverCard.Trigger data-footnote-ref href={href} id={id}>
      {label}
    </HoverCard.Trigger>
    <HoverCardContent>{children}</HoverCardContent>
  </HoverCard.Root>
);

export type { FootnoteProps };
export { FootnotePreview };
