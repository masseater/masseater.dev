import { useMutation } from "@tanstack/react-query";
import { openPath, openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { ExternalLink, FolderSearch } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { Notice } from "#/shared/ui/notice";

import { ActionButton } from "./action-button.tsx";

interface Opener {
  readonly open: (target: string) => Promise<void>;
  readonly Icon: LucideIcon;
  readonly label: string;
}

const OPENERS = {
  booth: { open: (url) => openUrl(url), Icon: ExternalLink, label: "BOOTH の商品ページを開く" },
  file: { open: (path) => openPath(path), Icon: ExternalLink, label: "ファイルを開く" },
  reveal: { open: revealItemInDir, Icon: FolderSearch, label: "エクスプローラーで表示" },
} as const satisfies Record<string, Opener>;

const OpenerButton = ({
  opens,
  target,
}: Readonly<{ opens: keyof typeof OPENERS; target: string }>): ReactNode => {
  const { open, Icon, label }: Opener = OPENERS[opens];
  const { mutate, error } = useMutation({ mutationFn: open });
  const onClick = useCallback(() => {
    mutate(target);
  }, [mutate, target]);
  return (
    <>
      <ActionButton onClick={onClick}>
        <Icon />
        {label}
      </ActionButton>
      {error !== null && (
        <Notice tone="error" size="xs">
          {error.message}
        </Notice>
      )}
    </>
  );
};

export { OpenerButton };
