import { RegistryProvider } from "@effect/atom-react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { yohakuAtom } from "#/shared/api";
import type { Yohaku } from "#/shared/api";

const Providers = ({
  children,
  client,
  yohaku,
}: Readonly<{ children: ReactNode; client: QueryClient; yohaku: Yohaku }>): ReactNode => {
  const initialValues = useMemo(() => [[yohakuAtom, yohaku] as const], [yohaku]);
  return (
    <QueryClientProvider client={client}>
      <RegistryProvider initialValues={initialValues}>{children}</RegistryProvider>
    </QueryClientProvider>
  );
};

export { Providers };
