import { Button } from "@masseater.dev/ui/button";
import { useMutation } from "@tanstack/react-query";
import { Check, Import } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { importToUnity } from "#/pages/home/api/import-to-unity";

const LABEL = "Unity に読み込む";
const SENT = "ファイルを Unity に渡しました";

const ImportToUnityButton = ({ assetId }: Readonly<{ assetId: number }>): ReactNode => {
  const { mutate, isPending, error, data, isSuccess } = useMutation({ mutationFn: importToUnity });
  const onClick = useCallback(() => {
    mutate(assetId);
  }, [mutate, assetId]);
  return (
    <>
      <Button className="self-start" onClick={onClick} disabled={isPending}>
        <Import />
        {LABEL}
      </Button>
      {error !== null && <p className="text-destructive text-xs">{error.message}</p>}
      {isSuccess && (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <Check className="size-3" />
          {`${data.toString()} ${SENT}`}
        </p>
      )}
    </>
  );
};

export { ImportToUnityButton };
