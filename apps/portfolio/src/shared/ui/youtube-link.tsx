import { Play } from "lucide-react";
import type { ReactNode } from "react";

const NEW_TAB_HINT = "（新しいタブで開く）";

const watchUrl = (id: string): string =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

const thumbnailUrl = (id: string): string =>
  `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

const YouTubeLink = ({ id, title }: Readonly<{ id: string; title: string }>): ReactNode => (
  <a
    className="group relative block aspect-video overflow-hidden rounded-lg bg-black"
    href={watchUrl(id)}
    rel="noopener noreferrer"
    target="_blank"
  >
    <img
      alt=""
      className="size-full object-cover transition group-hover:opacity-80"
      decoding="async"
      loading="lazy"
      src={thumbnailUrl(id)}
    />
    <span className="absolute inset-x-0 top-0 bg-linear-to-b from-black/70 to-transparent p-3 text-sm text-white">
      {title}
      <span className="sr-only">{NEW_TAB_HINT}</span>
    </span>
    <Play
      aria-hidden
      className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow"
    />
  </a>
);

export { YouTubeLink };
