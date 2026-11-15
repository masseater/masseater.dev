import type { ReactNode } from "react";

import { ApiKeyField } from "./api-key-field";
import { ModelField } from "./model-field";

export const RunSettings = (): ReactNode => (
  <>
    <ModelField />
    <ApiKeyField />
  </>
);
