import { ApiKeyInput } from "@masseater.dev/web-ui";
import type { ReactNode } from "react";

import { useApiKey, useSetApiKey } from "#/entities/inspection/index.ts";
import { COPY } from "#/shared/config/index.ts";

export const ApiKeyField = (): ReactNode => (
  <div className="flex-1">
    <ApiKeyInput label={COPY.apiKey} value={useApiKey()} onValueChange={useSetApiKey()} />
  </div>
);
