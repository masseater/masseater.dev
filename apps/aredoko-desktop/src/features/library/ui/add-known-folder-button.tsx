import { Button } from "@masseater.dev/ui/button";
import { Option } from "effect";
import { Library, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useAddFolder, useKnownFolder } from "#/features/library/api/queries";
import type { KnownFolder } from "#/features/library/api/queries";

interface Labelled {
  readonly label: string;
  readonly Icon: LucideIcon;
}

const LABELS: Readonly<Record<KnownFolder, Labelled>> = {
  assetStore: { label: "Unity Asset Store を追加", Icon: Store },
  blm: { label: "BOOTH Library Manager を追加", Icon: Library },
};

const AddKnownFolderButton = ({
  folder,
  size = "default",
}: Readonly<{ folder: KnownFolder; size?: "default" | "lg" }>): ReactNode => {
  const location = useKnownFolder(folder);
  const { mutate, isPending } = useAddFolder();
  const onClick = useCallback(() => {
    if (Option.isSome(location)) {
      mutate(location.value);
    }
  }, [mutate, location]);
  if (Option.isNone(location)) {
    return false;
  }
  const { label, Icon } = LABELS[folder];
  return (
    <Button variant="outline" size={size} onClick={onClick} disabled={isPending}>
      <Icon />
      {label}
    </Button>
  );
};

export { AddKnownFolderButton };
