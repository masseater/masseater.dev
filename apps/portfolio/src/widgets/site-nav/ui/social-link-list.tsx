import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Direction } from "#/widgets/site-nav/model/direction";
import { socialLinks } from "#/widgets/site-nav/model/social-links";

import { LinkList } from "./link-list";

const SocialLinkList = ({ direction }: Readonly<{ direction: Direction }>): ReactNode => (
  <LinkList direction={direction}>
    {pipe(
      socialLinks,
      Arr.map(({ label, href, style }) => (
        <li key={href}>
          <a className="stage-link vt-named px-2 py-3" href={href} style={style}>
            {label}
          </a>
        </li>
      )),
    )}
  </LinkList>
);

export { SocialLinkList };
