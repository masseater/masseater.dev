import type { Manuscript } from "@masseater.dev/yohaku-protocol";
import { Option } from "effect";
import type { ReactNode } from "react";

const ManuscriptExcerpt = ({
  manuscript,
}: Readonly<{ manuscript: typeof Manuscript.Type }>): ReactNode => {
  if (Option.isNone(Option.fromNullishOr(manuscript.title))) {
    return false;
  }
  return (
    <span className="text-muted-foreground truncate font-serif text-sm">{manuscript.excerpt}</span>
  );
};

export { ManuscriptExcerpt };
