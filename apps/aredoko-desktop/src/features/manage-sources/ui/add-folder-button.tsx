import { Button } from "@masseater.dev/ui/button";
import { FolderPlus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { usePickThen } from "#/features/manage-sources/api/pick-then.ts";
import { pickFolder } from "#/features/manage-sources/api/pickers.ts";
import { useAddFolder } from "#/features/manage-sources/api/queries.ts";

const LABEL = "フォルダを登録";

export const AddFolderButton = ({
  size = "default",
}: Readonly<{ size?: ComponentProps<typeof Button>["size"] }>): ReactNode => {
  const { mutate, isPending } = useAddFolder();
  const { onClick, busy } = usePickThen({ pick: pickFolder, onPicked: mutate, pending: isPending });
  return (
    <Button variant="outline" size={size} onClick={onClick} disabled={busy}>
      <FolderPlus />
      {LABEL}
    </Button>
  );
};
