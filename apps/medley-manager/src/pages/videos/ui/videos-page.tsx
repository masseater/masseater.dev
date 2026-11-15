import type { ReactNode } from "react";

import { PageTitle } from "#/shared/ui/page-title.tsx";

import { KindFilter } from "./kind-filter";
import { VideoResults } from "./video-results";

const TITLE = "動画";
const DESCRIPTION = "登録されているメドレー・合作の一覧です。";

export const VideosPage = (): ReactNode => (
  <div className="flex flex-col gap-6">
    <PageTitle title={TITLE} description={DESCRIPTION} />
    <KindFilter />
    <VideoResults />
  </div>
);
