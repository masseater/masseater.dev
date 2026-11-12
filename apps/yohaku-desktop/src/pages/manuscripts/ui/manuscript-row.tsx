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

const ManuscriptRow = ({
  manuscript,
}: Readonly<{ manuscript: typeof Manuscript.Type }>): ReactNode => {
  const [screen, setScreen] = useScreen();
  const onClick = useCallback(() => {
    setScreen(opened(manuscript.id)(screen));
  }, [manuscript.id, screen, setScreen]);
  return (
    <li className="border-b">
      <button className="flex w-full flex-col gap-1 py-3 text-left" type="button" onClick={onClick}>
        <span className="truncate font-bold">{nameOf(manuscript)}</span>
        <ManuscriptExcerpt manuscript={manuscript} />
      </button>
    </li>
  );
};

export { ManuscriptRow };
