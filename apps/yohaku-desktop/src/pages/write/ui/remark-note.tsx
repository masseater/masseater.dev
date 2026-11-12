import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useRemarkActions } from "#/pages/write/api/remark-actions.ts";
import type { Placed } from "#/pages/write/model/remark-layout.ts";

import { RemarkChoices } from "./remark-choices.tsx";
import { RemarkProposal } from "./remark-proposal.tsx";

const NOTE_TOP = "--note-top";

const RemarkNote = ({ placed }: Readonly<{ placed: Placed }>): ReactNode => {
  const actions = useRemarkActions(placed.marked);
  const { top } = placed;
  const placeRef = useCallback(
    (element: HTMLElement | null): void => {
      const found = Option.fromNullishOr(element);
      if (Option.isSome(found)) {
        found.value.style.setProperty(NOTE_TOP, `${top.toString()}px`);
      }
    },
    [top],
  );
  return (
    <aside
      ref={placeRef}
      aria-label={placed.marked.message}
      className="border-remark absolute top-(--note-top) left-0 flex w-full flex-col gap-1.5 border-l pt-2 pl-3"
    >
      <span className="text-remark text-xs">{placed.marked.message}</span>
      <RemarkProposal actions={actions} />
      <RemarkChoices actions={actions} />
    </aside>
  );
};

export { RemarkNote };
