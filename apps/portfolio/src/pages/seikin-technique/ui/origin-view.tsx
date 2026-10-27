import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { articleTitles, blogPath } from "#/entities/technique";
import type { Origin } from "#/entities/technique";

const OriginView = ({ origin }: Readonly<{ origin: Origin }>): ReactNode => (
  <section className="flex flex-col gap-3">
    <h2 className="text-muted-foreground text-sm">
      <a
        className="decoration-foreground/30 hover:decoration-foreground underline underline-offset-4"
        href={blogPath(origin.article)}
      >
        {articleTitles[origin.article]}
      </a>
      {` の「${origin.group}」より`}
    </h2>
    {pipe(
      origin.summary,
      Arr.map((paragraph) => (
        <p className="leading-loose" key={paragraph}>
          {paragraph}
        </p>
      )),
    )}
  </section>
);

export { OriginView };
