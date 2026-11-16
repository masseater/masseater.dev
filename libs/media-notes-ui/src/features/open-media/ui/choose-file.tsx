import { useAtom } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { FolderOpen } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { chooseFileAtom } from "#src/features/open-media/model/open.ts";

const CHOOSE = "ファイルを開く";

export const ChooseFile = (): ReactNode => {
  const [chosen, choose] = useAtom(chooseFileAtom);
  const click = useCallback(() => {
    choose();
  }, [choose]);
  return (
    <Button type="button" variant="outline" disabled={chosen.waiting} onClick={click}>
      <FolderOpen aria-hidden="true" />
      {CHOOSE}
    </Button>
  );
};
