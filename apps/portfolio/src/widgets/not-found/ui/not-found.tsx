import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Arrow } from "#/shared/ui";

const CODE = "404";
const TITLE = "ページが見つからない";
const MESSAGE = "URL が間違っているか、ページが移動した可能性がある。";
const BACK = "トップへ戻る";

const NotFound = (): ReactNode => (
  <div className="glass-surface mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 sm:px-12 sm:py-16">
    <p
      aria-hidden
      className="font-display text-foreground/20 text-8xl font-extralight tabular-nums sm:text-9xl"
    >
      {CODE}
    </p>
    <h1 className="font-display text-3xl font-light sm:text-4xl">{TITLE}</h1>
    <p className="text-foreground/70">{MESSAGE}</p>
    <Link className="stage-link group flex gap-2 self-start" to="/">
      <Arrow variant="back" />
      {BACK}
    </Link>
  </div>
);

export { NotFound };
