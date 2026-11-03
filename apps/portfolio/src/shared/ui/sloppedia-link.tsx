import { Link } from "@tanstack/react-router";
import { Match, pipe } from "effect";
import type { ReactNode } from "react";
import type { LinkProps } from "sloppedia";

const SloppediaLink = ({ target, className, children }: LinkProps): ReactNode =>
  pipe(
    Match.value(target),
    Match.discriminatorsExhaustive("page")({
      main: () => (
        <Link className={className} to="/sloppedia">
          {children}
        </Link>
      ),
      categories: () => (
        <Link className={className} to="/sloppedia/categories">
          {children}
        </Link>
      ),
      category: ({ name }) => (
        <Link className={className} hash={name} to="/sloppedia/categories">
          {children}
        </Link>
      ),
      article: (article) => (
        <Link className={className} params={article} to="/sloppedia/$slug">
          {children}
        </Link>
      ),
      home: () => (
        <Link className={className} to="/">
          {children}
        </Link>
      ),
    }),
  );

export { SloppediaLink };
