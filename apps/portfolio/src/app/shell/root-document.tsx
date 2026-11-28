import { RegistryProvider } from "@effect/atom-react";
import { skipTransitionsTo } from "@masseater.dev/ui/page-swap";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { filePaths, site } from "#/shared/config/index.ts";

const devtoolsPlugins = [
  { name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
  { name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
];

const skipTransitionsToFiles = skipTransitionsTo(filePaths);

const useFileTransitionsSkipped = (): void => {
  useEffect(() => {
    globalThis.addEventListener("pageswap", skipTransitionsToFiles);
    return (): void => {
      globalThis.removeEventListener("pageswap", skipTransitionsToFiles);
    };
  }, []);
};

export const RootDocument = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => {
  useFileTransitionsSkipped();
  return (
    <html lang={site.locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        <RegistryProvider>{children}</RegistryProvider>
        <TanStackDevtools plugins={devtoolsPlugins} />
        <Scripts />
      </body>
    </html>
  );
};
