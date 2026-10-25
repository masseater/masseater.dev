import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";
import { siBluesky, siFacebook, siHatenabookmark, siX } from "simple-icons";

import { entryPath } from "#/entities/entry";
import type { Entry } from "#/entities/entry";
import type { Direction } from "#/pages/entry/model/direction";
import { site } from "#/shared/config";

import { ShareLink } from "./share-link";

const SHARE_LABEL = "共有";

type ShareTarget = Readonly<{ label: string; href: string; iconPath: string }>;

const shareTargets = (entry: Entry): readonly ShareTarget[] => {
  const url = new URL(entryPath(entry), site.url);
  const text = `${entry.title} | ${site.name}`;
  return [
    {
      label: "X",
      iconPath: siX.path,
      href: `https://x.com/intent/post?${new URLSearchParams({ text, url: url.href })}`,
    },
    {
      label: "Bluesky",
      iconPath: siBluesky.path,
      href: `https://bsky.app/intent/compose?${new URLSearchParams({ text: `${text} ${url.href}` })}`,
    },
    {
      label: "はてなブックマーク",
      iconPath: siHatenabookmark.path,
      href: `https://b.hatena.ne.jp/entry/s/${url.host}${url.pathname}`,
    },
    {
      label: "Facebook",
      iconPath: siFacebook.path,
      href: `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams([["u", url.href]])}`,
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
        Arr.map(({ label, href, iconPath }) => (
          <ShareLink href={href} iconPath={iconPath} key={label} label={label} />
        )),
      )}
    </ul>
  </div>
);

export { ShareLinks };
