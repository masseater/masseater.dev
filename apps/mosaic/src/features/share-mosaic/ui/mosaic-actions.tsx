import { Button } from "@masseater.dev/ui/button";
import { Link } from "@tanstack/react-router";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { SHARE_TARGETS, shareText } from "#/features/share-mosaic/lib/share";

import { ShareLink } from "./share-link";

const REGENERATE = "再構成";
const NO_SEED = {};

export const MosaicActions = ({
  slug,
  seed,
}: Readonly<{ slug: string; seed: number }>): ReactNode => {
  const params = useMemo(() => ({ slug }), [slug]);
  const text = shareText({ slug, seed });
  return (
    <div className="flex shrink-0 gap-2">
      {pipe(
        SHARE_TARGETS,
        Array.map((target) => (
          <ShareLink
            key={target.name}
            name={target.name}
            path={target.path}
            href={target.href(text)}
          />
        )),
      )}
      <Button variant="outline" asChild>
        <Link to="/$slug" params={params} search={NO_SEED} reloadDocument>
          {REGENERATE}
        </Link>
      </Button>
    </div>
  );
};
