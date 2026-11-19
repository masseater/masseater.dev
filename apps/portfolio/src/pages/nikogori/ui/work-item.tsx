import type { ReactNode } from "react";

import { thumbnailPath, workPath } from "#/pages/nikogori/model/works.ts";
import type { Work } from "#/pages/nikogori/model/works.ts";
import type { ImagePriority } from "#/shared/lib/index.ts";

export const WorkItem = ({
  priority,
  work,
}: Readonly<{ priority: ImagePriority; work: Work }>): ReactNode => (
  <li>
    <a className="block" href={workPath(work)}>
      <img
        alt={work.title}
        className="h-auto w-full"
        decoding="async"
        fetchPriority={priority.fetchPriority}
        height={work.height}
        loading={priority.loading}
        src={thumbnailPath(work)}
        width={work.width}
      />
    </a>
  </li>
);
