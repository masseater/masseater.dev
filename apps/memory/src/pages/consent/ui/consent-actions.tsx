import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

const SCOPE = "記憶の読み書きを許可します";
const ALLOW = "許可する";
const DENY = "拒否する";
const FAILED = "許可できませんでした";

const ConsentActions = ({
  status,
  onAllow,
  onDeny,
}: Readonly<{
  status: "idle" | "pending" | "success" | "error";
  onAllow: () => void;
  onDeny: () => void;
}>): ReactNode => {
  const locked = status === "pending" || status === "success";
  return (
    <>
      <p>{SCOPE}</p>
      <div className="flex gap-3">
        <Button disabled={locked} onClick={onAllow}>
          {ALLOW}
        </Button>
        <Button variant="outline" disabled={locked} onClick={onDeny}>
          {DENY}
        </Button>
      </div>
      {status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {FAILED}
        </p>
      )}
    </>
  );
};

export { ConsentActions };
