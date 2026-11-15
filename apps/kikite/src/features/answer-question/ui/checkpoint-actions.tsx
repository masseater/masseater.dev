import { Button } from "@masseater.dev/ui/button";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useCheckpoint } from "#/entities/interview";
import type { Answering } from "#/features/answer-question/model/answering";

import { focusAnswer } from "./type-anywhere.ts";

const AGREE = "合っている";
const AGREED = "合っています";
const FIX = "直す";

export const CheckpointActions = ({ answering }: Readonly<{ answering: Answering }>): ReactNode => {
  const shown = useCheckpoint();
  const agree = useCallback(() => {
    answering.typed(AGREED);
  }, [answering]);
  return (
    shown && (
      <div className="flex gap-2">
        <Button onClick={agree}>{AGREE}</Button>
        <Button variant="outline" onClick={focusAnswer}>
          {FIX}
        </Button>
      </div>
    )
  );
};
