import { Option } from "effect";
import type { ReactNode } from "react";

import type { InfoboxRow } from "./article.ts";

const InfoboxValue = ({ row }: Readonly<{ row: InfoboxRow }>): ReactNode =>
  Option.match(Option.fromUndefinedOr(row.href), {
    onNone: () => row.value,
    onSome: (href) => (
      <a className="text-wiki-link hover:underline" href={href} rel="noreferrer" target="_blank">
        {row.value}
      </a>
    ),
  });

export { InfoboxValue };
