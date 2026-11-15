import { ApiKeyInput } from "@masseater.dev/web-ui";
import type { ReactNode } from "react";

import { useApiKey, useSetApiKey } from "#/entities/inspection";
import { COPY } from "#/shared/config";

const ApiKeyField = (): ReactNode => (
  <div className="flex-1">
    <ApiKeyInput label={COPY.apiKey} value={useApiKey()} onValueChange={useSetApiKey()} />
  </div>
);

export { ApiKeyField };
