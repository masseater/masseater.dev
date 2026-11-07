import { RegistryProvider } from "@effect/atom-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

const Providers = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <QueryClientProvider client={queryClient}>
    <RegistryProvider>{children}</RegistryProvider>
  </QueryClientProvider>
);

export { Providers };
