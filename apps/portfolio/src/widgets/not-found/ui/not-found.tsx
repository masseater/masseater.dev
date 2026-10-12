import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const TITLE = "ページが見つからない";
const MESSAGE = "URL が間違っているか、ページが移動した可能性がある。";
const BACK = "トップへ戻る";

const NotFound = (): ReactNode => (
  <div className="flex flex-col gap-4">
    <h1 className="font-display text-4xl font-light">{TITLE}</h1>
    <p className="text-foreground/70">{MESSAGE}</p>
    <Link className="stage-link self-start" to="/">
      {BACK}
    </Link>
  </div>
);

export { NotFound };
