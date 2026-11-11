import { useCallback } from "react";
import type { ReactNode } from "react";

import { useChangeSettings, useSettings } from "#/pages/interview/model/hooks";
import type { ModelId } from "#strategies";

import { Chip } from "./chip.tsx";

const ModelChip = ({ id }: Readonly<{ id: ModelId }>): ReactNode => {
  const { model } = useSettings();
  const change = useChangeSettings();
  const onClick = useCallback(() => {
    change({ model: id });
  }, [change, id]);
  return <Chip active={model === id} label={id} onClick={onClick} />;
};

export { ModelChip };
