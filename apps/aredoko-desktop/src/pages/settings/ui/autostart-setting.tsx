import type { ReactNode } from "react";

import { useAutostart, useSetAutostart } from "#/pages/settings/api/autostart";
import { Switch } from "#/shared/ui/switch";

const ID = "autostart";
const LABEL = "Windows へのサインイン時に起動する";

const AutostartSetting = (): ReactNode => {
  const autostart = useAutostart();
  const { mutate, isPending } = useSetAutostart();
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <label htmlFor={ID} className="text-sm font-medium">
        {LABEL}
      </label>
      <Switch
        id={ID}
        checked={autostart.data ?? false}
        disabled={!autostart.isSuccess || isPending}
        onCheckedChange={mutate}
      />
    </div>
  );
};

export { AutostartSetting };
