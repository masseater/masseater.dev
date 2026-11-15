import type { ReactNode } from "react";

import { thumbnailPath, workPath } from "#/pages/nikogori/model/works";
import type { Work } from "#/pages/nikogori/model/works";

const WorkItem = ({ work }: Readonly<{ work: Work }>): ReactNode => (
  <li>
    <a className="block" href={workPath(work)}>
      <img
        alt={work.title}
        className="h-auto w-full"
        decoding="async"
        height={work.height}
        src={thumbnailPath(work)}
        width={work.width}
      />
    </a>
  </li>
);

export { WorkItem };
