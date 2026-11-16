import type { ReactNode } from "react";

import { ApiKeyField } from "./api-key-field.tsx";
import { ModelField } from "./model-field.tsx";

export const RunSettings = (): ReactNode => (
  <>
    <ModelField />
    <ApiKeyField />
  </>
);
