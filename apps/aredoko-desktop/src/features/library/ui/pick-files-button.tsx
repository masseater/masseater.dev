import { Button } from "@masseater.dev/ui/button";
import { FilePlus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { usePickThen } from "#/features/library/api/pick-then";
import { pickFiles } from "#/features/library/api/pickers";
import { useImportFiles } from "#/features/library/api/queries";

const LABEL = "ファイルを取り込む";

const PickFilesButton = ({
  size = "default",
  variant = "default",
}: Readonly<{
  size?: ComponentProps<typeof Button>["size"];
  variant?: ComponentProps<typeof Button>["variant"];
}>): ReactNode => {
  const { mutate, isPending } = useImportFiles();
  const { onClick, busy } = usePickThen({ pick: pickFiles, onPicked: mutate, pending: isPending });
  return (
    <Button size={size} variant={variant} onClick={onClick} disabled={busy}>
      <FilePlus />
      {LABEL}
    </Button>
  );
};

export { PickFilesButton };
