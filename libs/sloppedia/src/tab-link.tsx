import { Option } from "effect";
import type { ReactNode } from "react";

const TabLink = ({
  hrefOf,
  slug,
  label,
}: Readonly<{
  hrefOf: Option.Option<(slug: string) => string>;
  slug: string;
  label: string;
}>): ReactNode =>
  Option.match(hrefOf, {
    onNone: () => false,
    onSome: (href) => (
      <a
        className="text-wiki-link px-2 py-1 hover:underline"
        href={href(slug)}
        rel="noreferrer"
        target="_blank"
      >
        {label}
      </a>
    ),
  });

export { TabLink };
