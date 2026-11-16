import { CopyMcpCommand, OpenBar } from "@masseater.dev/media-notes-ui";
import type { ReactNode } from "react";

import { useFollowing } from "#/entities/comment/index.ts";

import { ReviewBody } from "./review-body.tsx";

export const ReviewPage = (): ReactNode => {
  useFollowing();
  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5">
      <header className="flex items-start gap-2 [&>form]:flex-1">
        <OpenBar files label="動画のリンク" />
        <CopyMcpCommand name="akapen" />
      </header>
      <ReviewBody />
    </main>
  );
};
