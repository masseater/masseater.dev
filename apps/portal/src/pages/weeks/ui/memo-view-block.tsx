import type { ViewNode } from "@masseater.dev/watashi-protocol";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { ViewNodes } from "#/entities/watashi/index.ts";
import type { MemoValue } from "#/entities/watashi/index.ts";

const isBody = (node: ViewNode): boolean => node.type !== "Headline";

const shownOf =
  (headless: boolean) =>
  (view: readonly ViewNode[]): readonly ViewNode[] => {
    if (headless) {
      return pipe(view, Arr.filter(isBody));
    }
    return view;
  };

const nodesOf = (memo: MemoValue, headless: boolean): readonly ViewNode[] =>
  pipe(
    Option.fromUndefinedOr(memo.view),
    Option.map(shownOf(headless)),
    Option.getOrElse((): readonly ViewNode[] => [{ type: "Text", text: memo.content }]),
  );

export const MemoViewBlock = ({
  headless,
  memo,
}: Readonly<{ headless: boolean; memo: MemoValue }>): ReactNode => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <ViewNodes nodes={nodesOf(memo, headless)} />
  </div>
);
