import { getRouteApi } from "@tanstack/react-router";
import { Option, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode, RefCallback } from "react";

import { stageOf } from "#/pages/ai-produced-song/lib/stage.ts";

const route = getRouteApi("/ai-produced/$slug");

export const SongPage = (): ReactNode => {
  const { slug } = route.useLoaderData();
  const attach: RefCallback<HTMLElement> = useCallback(
    (root) => pipe(Option.fromNullishOr(root), Option.map(stageOf(slug)), Option.getOrUndefined),
    [slug],
  );
  return <main className="min-h-dvh" ref={attach} />;
};
