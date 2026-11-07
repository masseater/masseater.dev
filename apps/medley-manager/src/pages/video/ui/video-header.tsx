import { Option } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { KindBadge } from "#/entities/catalog";
import { useVideo } from "#/pages/video/api/use-video";
import { formatDate } from "#/shared/lib/date";
import { Facts } from "#/shared/ui/facts";
import { Note } from "#/shared/ui/note";

import { VideoPlayer } from "./video-player";
import { WatchLink } from "./watch-link";

const VideoHeader = (): ReactNode => {
  const video = useVideo();
  const facts = useMemo(
    () => [video.uploader, Option.getOrNull(formatDate(video.publishedAt)), video.videoId],
    [video],
  );
  return (
    <header className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <VideoPlayer video={video} />
      </div>
      <div className="flex flex-col items-start gap-3 lg:col-span-2">
        <KindBadge kind={video.kind} />
        <h1 className="font-display text-2xl leading-snug sm:text-3xl">{video.title}</h1>
        <Facts values={facts} />
        <WatchLink video={video} />
        <Note text={video.note} />
        <Note text={video.comment} />
      </div>
    </header>
  );
};

export { VideoHeader };
