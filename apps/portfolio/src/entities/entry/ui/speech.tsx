import type { ReactNode } from "react";

import { speakers } from "#/entities/entry/model/speaker";
import type { Side, Speaker } from "#/entities/entry/model/speaker";

const AVATAR_SIZE = 40;

const rowClass = {
  start: "flex-row",
  end: "flex-row-reverse",
} as const satisfies Record<Side, string>;

const bubbleClass = {
  start: "bg-card ring-foreground/10 rounded-tl-sm ring-1",
  end: "bg-muted rounded-tr-sm",
} as const satisfies Record<Side, string>;

const Speech = ({
  speaker,
  children,
}: Readonly<{ speaker: Speaker; children: ReactNode }>): ReactNode => {
  const { name, avatar, side } = speakers[speaker];
  return (
    <figure className={`my-6 flex items-start gap-3 ${rowClass[side]}`}>
      <figcaption className="text-muted-foreground prose-img:m-0 mt-0 flex w-14 shrink-0 flex-col items-center gap-1 text-xs">
        <img
          alt=""
          className="size-10 rounded-full"
          height={AVATAR_SIZE}
          src={avatar}
          width={AVATAR_SIZE}
        />
        {name}
      </figcaption>
      <div
        className={`min-w-0 rounded-2xl px-4 py-3 *:first:mt-0 *:last:mb-0 ${bubbleClass[side]}`}
      >
        {children}
      </div>
    </figure>
  );
};

export { Speech };
