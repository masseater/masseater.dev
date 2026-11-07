import { ApiKeyInput } from "@masseater.dev/web-ui";
import type { ReactNode } from "react";

import { COPY } from "#/pages/extract/model/copy";
import { useApiKey, useSetApiKey } from "#/pages/extract/model/draft";

const ApiKeyField = (): ReactNode => (
  <ApiKeyInput label={COPY.apiKey} value={useApiKey()} onValueChange={useSetApiKey()} />
);

export { ApiKeyField };
