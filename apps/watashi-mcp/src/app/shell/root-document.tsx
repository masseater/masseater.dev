import { HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";

const RootDocument = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <html lang="ja">
    <head>
      <meta charSet="utf-8" />
      <HeadContent />
    </head>
    <body>
      <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 p-6">
        {children}
      </main>
      <Scripts />
    </body>
  </html>
);

export { RootDocument };
