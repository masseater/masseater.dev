import type { Media } from "@masseater.dev/media-notes-protocol";
import { Option } from "effect";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { pageOf } from "#/entities/media/model/media.ts";
import { SITE_NAMES } from "#/shared/config/index.ts";
import { clock } from "#/shared/lib/clock.ts";

const PageLink = ({ media }: Readonly<{ media: Media }>): ReactNode =>
  Option.match(pageOf(media.source), {
    onNone: () => false,
    onSome: (page) => (
      <a
        href={page}
        target="_blank"
        rel="noreferrer"
        aria-label="元のページ"
        className="text-muted-foreground hover:text-foreground self-center"
      >
        <ExternalLink className="size-4" />
      </a>
    ),
  });

export const MediaMeta = ({
  media,
  duration,
}: Readonly<{ media: Media; duration: number }>): ReactNode => (
  <header className="flex min-w-0 items-baseline gap-3">
    <span className="text-muted-foreground text-xs">{SITE_NAMES[media.source.site]}</span>
    <h1 className="min-w-0 truncate text-base font-semibold">{media.title}</h1>
    <span className="text-muted-foreground truncate text-sm">{media.artist}</span>
    <span className="text-muted-foreground ml-auto font-mono text-xs tabular-nums">
      {clock(duration)}
    </span>
    <PageLink media={media} />
  </header>
);
