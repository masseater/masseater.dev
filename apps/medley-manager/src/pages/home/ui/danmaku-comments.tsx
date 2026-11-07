import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { Comment } from "#/pages/home/lib/danmaku";

const DanmakuComments = ({ comments }: Readonly<{ comments: readonly Comment[] }>): ReactNode => (
  <span className="flex gap-16 pr-16">
    {pipe(
      comments,
      Array.map((comment) => (
        <span
          key={comment.key}
          className={`text-shadow-comment text-lg font-bold whitespace-nowrap sm:text-2xl ${comment.color}`}
        >
          {comment.text}
        </span>
      )),
    )}
  </span>
);

export { DanmakuComments };
