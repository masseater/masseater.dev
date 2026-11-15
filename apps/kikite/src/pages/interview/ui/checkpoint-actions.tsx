import { Button } from "@masseater.dev/ui/button";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useCheckpoint } from "#/entities/interview";
import { useSession } from "#/pages/interview/model/session-hooks";

import { focusAnswer } from "./type-anywhere.ts";

const AGREE = "合っている";
const AGREED = "合っています";
const FIX = "直す";

export const CheckpointActions = (): ReactNode => {
  const session = useSession();
  const shown = useCheckpoint();
  const agree = useCallback(() => {
    if (Option.isSome(session)) {
      session.value.typed(AGREED);
    }
  }, [session]);
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
