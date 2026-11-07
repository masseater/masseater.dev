import { Option } from "effect";
import type { ReactNode } from "react";

const PLAY_MARK = "▶";

const ThumbnailImage = ({ src }: Readonly<{ src: string | null }>): ReactNode =>
  Option.match(Option.fromNullOr(src), {
    onNone: () => <span aria-hidden="true">{PLAY_MARK}</span>,
    onSome: (url) => (
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    ),
  });

export { ThumbnailImage };
