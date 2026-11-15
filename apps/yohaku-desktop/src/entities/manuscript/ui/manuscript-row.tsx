import type { Manuscript } from "@masseater.dev/yohaku-protocol";
import { Option, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { opened, useScreen } from "#/shared/model";

import { ManuscriptExcerpt } from "./manuscript-excerpt.tsx";

const nameOf = ({ title, excerpt }: typeof Manuscript.Type): string =>
  pipe(
    Option.fromNullishOr(title),
    Option.match({ onNone: () => excerpt, onSome: ({ text }) => text }),
  );

export const ManuscriptRow = ({
  manuscript,
  children,
}: Readonly<{ manuscript: typeof Manuscript.Type; children: ReactNode }>): ReactNode => {
  const [screen, setScreen] = useScreen();
  const onClick = useCallback(() => {
    setScreen(opened(manuscript.id)(screen));
  }, [manuscript.id, screen, setScreen]);
  return (
    <div className="flex items-center gap-2">
      <button
        className="flex min-w-0 flex-1 flex-col gap-1 py-3 text-left"
        type="button"
        onClick={onClick}
      >
        <span className="truncate font-bold">{nameOf(manuscript)}</span>
        <ManuscriptExcerpt manuscript={manuscript} />
      </button>
      {children}
    </div>
  );
};
