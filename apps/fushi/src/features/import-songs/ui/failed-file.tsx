import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

export const FailedFile = ({
  file,
  message,
}: Readonly<{ file: string; message: string }>): ReactNode => (
  <li className="text-destructive flex items-start gap-2 text-sm">
    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
    <span className="grid">
      <span className="font-medium">{file}</span>
      <span>{message}</span>
    </span>
  </li>
);
