import { Option } from "effect";
import type { ReactNode } from "react";

import type { Named } from "#/entities/catalog/lib/part";

import { VideoLink } from "./video-link";

const QUOTED = "引用";

const PartQuote = ({ video }: Readonly<{ video: Named | null }>): ReactNode =>
  Option.match(Option.fromNullOr(video), {
    onNone: () => false,
    onSome: (found) => (
      <span className="flex items-center gap-2 text-sm">
        <span className="bg-accent rounded-sm px-1.5 text-xs font-bold">{QUOTED}</span>
        <VideoLink id={found.id} title={found.title} />
      </span>
    ),
  });

export { PartQuote };
