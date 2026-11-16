import { ApiKeyInput } from "@masseater.dev/web-ui";
import type { ReactNode } from "react";

import { useApiKey, useSetApiKey } from "#/entities/extraction/index.ts";
import { COPY } from "#/shared/config/index.ts";

export const ApiKeyField = (): ReactNode => (
  <ApiKeyInput label={COPY.apiKey} value={useApiKey()} onValueChange={useSetApiKey()} />
);
