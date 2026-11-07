import type { ReactNode } from "react";

import { VideoList } from "#/entities/catalog";
import { useSearchResults } from "#/pages/search/api/use-search-results";
import { SectionHeading } from "#/shared/ui/section-heading";

const uploaderOf = ({ uploader }: Readonly<{ uploader: string | null }>): string => uploader ?? "";

const FoundVideos = (): ReactNode => {
  const { videos } = useSearchResults();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="動画" count={videos.length} />
      <VideoList videos={videos} describe={uploaderOf} />
    </section>
  );
};

export { FoundVideos };
