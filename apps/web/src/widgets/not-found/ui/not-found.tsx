import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const TITLE = "ページが見つからない";
const MESSAGE = "URL が間違っているか、ページが移動した可能性がある。";
const BACK = "トップへ戻る";

const NotFound = (): ReactNode => (
  <div className="flex flex-col gap-4">
    <h1 className="font-display text-3xl font-bold">{TITLE}</h1>
    <p className="text-muted-foreground">{MESSAGE}</p>
    <Link className="underline underline-offset-4" to="/">
      {BACK}
    </Link>
  </div>
);

export { NotFound };
