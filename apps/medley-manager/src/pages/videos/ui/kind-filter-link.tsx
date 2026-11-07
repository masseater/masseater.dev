import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { VIDEO_KIND_LABEL } from "#/entities/catalog";
import type { VideoKind } from "#/entities/catalog";
import { variantOf } from "#/pages/videos/lib/variant";
import { Button } from "#/shared/ui/button";

const KindFilterLink = ({
  kind,
  selected,
}: Readonly<{ kind: VideoKind; selected: boolean }>): ReactNode => {
  const search = useMemo(() => ({ kind }), [kind]);
  return (
    <Button asChild size="sm" variant={variantOf(selected)}>
      <Link to="/videos" search={search}>
        {VIDEO_KIND_LABEL[kind]}
      </Link>
    </Button>
  );
};

export { KindFilterLink };
