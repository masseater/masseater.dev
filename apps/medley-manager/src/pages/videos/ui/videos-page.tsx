import type { ReactNode } from "react";

import { PageTitle } from "#/shared/ui/page-title";

import { KindFilter } from "./kind-filter";
import { VideoResults } from "./video-results";

const TITLE = "動画";
const DESCRIPTION = "登録されているメドレー・合作の一覧です。";

const VideosPage = (): ReactNode => (
  <div className="flex flex-col gap-6">
    <PageTitle title={TITLE} description={DESCRIPTION} />
    <KindFilter />
    <VideoResults />
  </div>
);

export { VideosPage };
