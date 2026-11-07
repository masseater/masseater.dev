import type { ReactNode } from "react";

import { ApiKeyField } from "./api-key-field";
import { ModelField } from "./model-field";

const RunSettings = (): ReactNode => (
  <>
    <ModelField />
    <ApiKeyField />
  </>
);

export { RunSettings };
