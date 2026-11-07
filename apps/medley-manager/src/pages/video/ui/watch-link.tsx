import { Option } from "effect";
import type { ReactNode } from "react";

import { embedUrl, watchUrl } from "#/entities/catalog";
import { Button } from "#/shared/ui/button";

const OPEN = "元動画を開く ↗";

type Watchable = Readonly<{ videoId: string | null; url: string }>;

const WatchLink = ({ video }: Readonly<{ video: Watchable }>): ReactNode =>
  Option.match(
    watchUrl({ target: video, start: Option.none() }).pipe(
      Option.filter(() => Option.isNone(embedUrl(video))),
    ),
    {
      onNone: () => false,
      onSome: (href) => (
        <Button asChild>
          <a href={href} target="_blank" rel="noreferrer">
            {OPEN}
          </a>
        </Button>
      ),
    },
  );

export { WatchLink };
