import type { ReactNode } from "react";

import type { ButtonComponent } from "./button-component";

const ALLOW = "許可する";
const DENY = "拒否する";
const FAILED = "許可できませんでした";

const ConsentActions = ({
  button: Button,
  scope,
  status,
  onAllow,
  onDeny,
}: Readonly<{
  button: ButtonComponent;
  scope: string;
  status: "idle" | "pending" | "success" | "error";
  onAllow: () => void;
  onDeny: () => void;
}>): ReactNode => {
  const locked = status === "pending" || status === "success";
  return (
    <>
      <p>{scope}</p>
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
