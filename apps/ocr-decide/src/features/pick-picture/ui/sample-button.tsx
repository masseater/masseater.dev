import { Button } from "@masseater.dev/web-ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useSetChoice } from "#/entities/extraction";

export const SampleButton = ({
  name,
  label,
}: Readonly<{ name: string; label: string }>): ReactNode => {
  const choose = useSetChoice();
  const click = useCallback(() => {
    choose({ status: "chosen", name, url: `${import.meta.env.BASE_URL}samples/${name}` });
  }, [name, choose]);
  return (
    <Button variant="outline" onClick={click}>
      {label}
    </Button>
  );
};
