import { Button } from "@masseater.dev/ui/button";
import { FolderPlus } from "lucide-react";
import type { ReactNode } from "react";

import { usePickThen } from "#/features/library/api/pick-then";
import { pickFolder } from "#/features/library/api/pickers";
import { useAddFolder } from "#/features/library/api/queries";

const LABEL = "フォルダを登録";

const AddFolderButton = ({
  size = "default",
}: Readonly<{ size?: "default" | "lg" }>): ReactNode => {
  const { mutate, isPending } = useAddFolder();
  const { onClick, busy } = usePickThen({ pick: pickFolder, onPicked: mutate, pending: isPending });
  return (
    <Button variant="outline" size={size} onClick={onClick} disabled={busy}>
      <FolderPlus />
      {LABEL}
    </Button>
  );
};

export { AddFolderButton };
