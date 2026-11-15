import type { ReactNode } from "react";

export const CodeBlock = ({ code }: Readonly<{ code: string }>): ReactNode => (
  <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
    <code>{code}</code>
  </pre>
);
