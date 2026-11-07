import type { ReactNode } from "react";

const CodeBlock = ({ code }: Readonly<{ code: string }>): ReactNode => (
  <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
    <code>{code}</code>
  </pre>
);

export { CodeBlock };
