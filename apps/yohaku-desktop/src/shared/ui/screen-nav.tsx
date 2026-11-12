import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { Page } from "#/shared/model";

import { NavButton } from "./nav-button.tsx";

interface Destination {
  readonly label: string;
  readonly page: Page;
}

const LABEL = "画面";

const DESTINATIONS: readonly Destination[] = [
  { label: "本文", page: "write" },
  { label: "原稿", page: "manuscripts" },
  { label: "資料", page: "sources" },
];

const ScreenNav = (): ReactNode => (
  <nav aria-label={LABEL} className="flex gap-1">
    {pipe(
      DESTINATIONS,
      Array.map(({ label, page }) => <NavButton key={page} label={label} page={page} />),
    )}
  </nav>
);

export { ScreenNav };
