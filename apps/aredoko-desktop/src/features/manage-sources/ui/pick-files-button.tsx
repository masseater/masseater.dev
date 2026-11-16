import { Button } from "@masseater.dev/ui/button";
import { FilePlus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { usePickThen } from "#/features/manage-sources/api/pick-then.ts";
import { pickFiles } from "#/features/manage-sources/api/pickers.ts";
import { useImportFiles } from "#/features/manage-sources/api/queries.ts";

const LABEL = "ファイルを取り込む";

export const PickFilesButton = ({
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
