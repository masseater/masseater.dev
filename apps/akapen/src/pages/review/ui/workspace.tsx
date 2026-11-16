import type { Media } from "@masseater.dev/media-notes-protocol";
import type { ReactNode } from "react";

import { CommentForm } from "#/features/write-comment";

import { MediaComments } from "./media-comments.tsx";
import { Stage } from "./stage.tsx";

export const Workspace = ({ media }: Readonly<{ media: Media }>): ReactNode => (
  <div className="grid items-start gap-6 lg:grid-cols-3">
    <Stage media={media} />
    <aside className="grid gap-4 lg:sticky lg:top-4">
      <CommentForm />
      <MediaComments media={media} />
    </aside>
  </div>
);
