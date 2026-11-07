import { ApiKeyInput } from "@masseater.dev/web-ui";
import type { ReactNode } from "react";

import { COPY } from "#/pages/inspect/model/copy";
import { useApiKey, useSetApiKey } from "#/pages/inspect/model/draft";

const ApiKeyField = (): ReactNode => (
  <div className="flex-1">
    <ApiKeyInput label={COPY.apiKey} value={useApiKey()} onValueChange={useSetApiKey()} />
  </div>
);

export { ApiKeyField };
