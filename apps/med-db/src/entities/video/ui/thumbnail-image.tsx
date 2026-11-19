import { Option } from "effect";
import type { ReactNode } from "react";

const PLAY_MARK = "▶";

const LOADING = {
  lcp: { loading: "eager", fetchPriority: "high" },
  lazy: { loading: "lazy", fetchPriority: "auto" },
} as const;

export type ThumbnailPriority = keyof typeof LOADING;

export const ThumbnailImage = ({
  src,
  priority,
}: Readonly<{ src: string | null; priority: ThumbnailPriority }>): ReactNode =>
  Option.match(Option.fromNullOr(src), {
    onNone: () => <span aria-hidden="true">{PLAY_MARK}</span>,
    onSome: (url) => (
      <img
        src={url}
        alt=""
        loading={LOADING[priority].loading}
        fetchPriority={LOADING[priority].fetchPriority}
        decoding="async"
        referrerPolicy="no-referrer"
        className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
      />
    ),
  });
