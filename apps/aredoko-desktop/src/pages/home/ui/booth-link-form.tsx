import { Button } from "@masseater.dev/ui/button";
import { useCallback } from "react";
import type { ChangeEvent, SubmitEvent, ReactNode } from "react";

import { useLinkBooth } from "#/pages/home/api/queries";
import { useBoothDraft, useSetBoothDraft } from "#/pages/home/model";
import { Input } from "#/shared/ui/input";

const PLACEHOLDER = "https://booth.pm/ja/items/…";
const LABEL = "BOOTH の商品ページの URL";
const SUBMIT = "紐づける";

const BoothLinkForm = ({ packageId }: Readonly<{ packageId: number }>): ReactNode => {
  const url = useBoothDraft(packageId);
  const setDraft = useSetBoothDraft();
  const link = useLinkBooth();
  const { mutate } = link;
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDraft({ packageId, url: event.target.value });
    },
    [packageId, setDraft],
  );
  const onSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      mutate({ packageId, url });
    },
    [mutate, packageId, url],
  );
  return (
    <form className="flex flex-col gap-2" onSubmit={onSubmit}>
      <div className="flex gap-2">
        <Input placeholder={PLACEHOLDER} aria-label={LABEL} value={url} onChange={onChange} />
        <Button type="submit" disabled={link.isPending}>
          {SUBMIT}
        </Button>
      </div>
      {link.isError && <p className="text-destructive text-xs">{link.error.message}</p>}
    </form>
  );
};

export { BoothLinkForm };
