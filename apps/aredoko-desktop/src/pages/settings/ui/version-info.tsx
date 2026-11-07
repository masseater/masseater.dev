import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useStatus } from "#/shared/api";

const NAME = "aredoko";

const VersionInfo = (): ReactNode => {
  const status = useStatus();
  const label = pipe(
    Option.fromUndefinedOr(status.data),
    Option.map(({ version }) => `${NAME} ${version}`),
    Option.getOrElse(() => NAME),
  );
  return <p className="text-muted-foreground text-xs">{label}</p>;
};

export { VersionInfo };
