import { MicOff } from "lucide-react";
import type { ReactNode } from "react";

const ListeningFailed = ({ message }: Readonly<{ message: string }>): ReactNode => (
  <span className="text-destructive flex items-center gap-1 text-xs">
    <MicOff className="size-5" />
    {message}
  </span>
);

export { ListeningFailed };
