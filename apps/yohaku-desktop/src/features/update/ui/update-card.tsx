import { ArrowUpCircle } from "lucide-react";
import type { ReactNode } from "react";

import type { Release } from "#/shared/api";

import { ReleaseNotesLink } from "./release-notes-link.tsx";
import { UpdateAction } from "./update-action.tsx";

const LABEL = "更新";

const UpdateCard = ({ release }: Readonly<{ release: Release }>): ReactNode => (
  <aside
    aria-label={LABEL}
    className="bg-popover text-popover-foreground fixed right-4 bottom-4 flex items-center gap-3 rounded-md border py-1.5 pr-1.5 pl-3 text-sm shadow-sm"
  >
    <ArrowUpCircle aria-hidden="true" className="text-muted-foreground size-4" />
    <ReleaseNotesLink release={release} />
    <UpdateAction />
  </aside>
);

export { UpdateCard };
