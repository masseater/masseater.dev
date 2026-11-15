import { ApiKeyInput } from "@masseater.dev/web-ui";
import type { ReactNode } from "react";

import { useApiKey, useSetApiKey } from "#/entities/extraction";
import { COPY } from "#/shared/config";

const ApiKeyField = (): ReactNode => (
  <ApiKeyInput label={COPY.apiKey} value={useApiKey()} onValueChange={useSetApiKey()} />
);

export { ApiKeyField };
