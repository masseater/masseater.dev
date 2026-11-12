import { Button } from "@masseater.dev/ui/button";
import { Option } from "effect";
import type { ReactNode } from "react";

import { useRemarkActions } from "#/pages/write/api/remark-actions.ts";
import type { Placed } from "#/pages/write/model/remark-layout.ts";

const Proposal = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <p className="font-serif text-sm leading-7 text-draft">{text}</p>
);

const RemarkNote = ({ placed }: Readonly<{ placed: Placed }>): ReactNode => {
  const actions = useRemarkActions(placed.marked);
  return (
    <aside
      aria-label={placed.marked.message}
      className="absolute left-0 flex w-full flex-col gap-1.5 border-l border-remark pt-2 pl-3"
      style={{ top: placed.top }}
    >
      <span className="text-xs text-remark">{placed.marked.message}</span>
      {Option.match(actions.rewriting ? actions.proposal : Option.none(), {
        onNone: () => null,
        onSome: (text) => <Proposal text={text} />,
      })}
      {actions.rewriting ? (
        <div className="flex gap-1.5">
          <Button size="sm" disabled={!actions.done} onClick={actions.replace}>
            置き換える
          </Button>
          <Button size="sm" variant="outline" onClick={actions.cancel}>
            やめる
          </Button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={actions.rewrite}>
            書き直させる
          </Button>
          <Button size="sm" variant="outline" onClick={actions.keep}>
            残す
          </Button>
        </div>
      )}
    </aside>
  );
};

export { RemarkNote };
