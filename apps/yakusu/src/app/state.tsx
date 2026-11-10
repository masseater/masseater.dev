import { RegistryProvider } from "@effect/atom-react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { engineAtom } from "#/shared/api";
import type { Engine } from "#/shared/api";

const Providers = ({
  children,
  client,
  engine,
}: Readonly<{ children: ReactNode; client: QueryClient; engine: Engine }>): ReactNode => {
  const initialValues = useMemo(() => [[engineAtom, engine] as const], [engine]);
  return (
    <QueryClientProvider client={client}>
      <RegistryProvider initialValues={initialValues}>{children}</RegistryProvider>
    </QueryClientProvider>
  );
};

export { Providers };
