import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { entryPath } from "#/entities/entry";
import type { Entry } from "#/entities/entry";
import type { Direction } from "#/pages/entry/model/direction";
import { site } from "#/shared/config";

import { ShareLink } from "./share-link";

const SHARE_LABEL = "共有";

const shareTargets = (entry: Entry): readonly Readonly<{ label: string; href: string }>[] => {
  const url = new URL(entryPath(entry), site.url);
  const text = `${entry.title} | ${site.name}`;
  return [
    {
      label: "X",
      href: `https://x.com/intent/post?${new URLSearchParams({ text, url: url.href })}`,
    },
    {
      label: "Bluesky",
      href: `https://bsky.app/intent/compose?${new URLSearchParams({ text: `${text} ${url.href}` })}`,
    },
    {
      label: "はてブ",
      href: `https://b.hatena.ne.jp/entry/s/${url.host}${url.pathname}`,
    },
  ];
};

const SHARE_CLASS = {
  row: "flex flex-wrap items-center gap-3",
  column: "flex flex-col items-center gap-3",
} as const;

const LIST_CLASS = {
  row: "flex flex-wrap items-center gap-2",
  column: "flex flex-col items-center gap-2",
} as const;

const ShareLinks = ({
  entry,
  direction,
}: Readonly<{ entry: Entry; direction: Direction }>): ReactNode => (
  <div className={SHARE_CLASS[direction]}>
    <span>{SHARE_LABEL}</span>
    <ul className={LIST_CLASS[direction]}>
      {pipe(
        shareTargets(entry),
        Arr.map(({ label, href }) => <ShareLink href={href} key={label} label={label} />),
      )}
    </ul>
  </div>
);

export { ShareLinks };
