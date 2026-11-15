import { Option } from "effect";
import type { ReactNode } from "react";

import type { PartStartLink } from "#/entities/video/@x/part";

const CHIP = "rounded-full bg-screen px-2 py-0.5 text-xs font-bold text-comment-cyan tabular-nums";

export const PartStart = ({
  start,
}: Readonly<{ start: Option.Option<PartStartLink> }>): ReactNode =>
  start.pipe(
    Option.match({
      onNone: () => false,
      onSome: (link) =>
        link.href.pipe(
          Option.match({
            onNone: () => <span className={CHIP}>{link.label}</span>,
            onSome: (href) => (
              <a href={href} target="_blank" rel="noreferrer" className={`${CHIP} hover:underline`}>
                {link.label}
              </a>
            ),
          }),
        ),
    }),
  );
