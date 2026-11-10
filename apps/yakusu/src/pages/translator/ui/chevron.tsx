import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

const Chevron = ({ open }: Readonly<{ open: boolean }>): ReactNode => {
  if (open) {
    return <ChevronUp className="size-5" />;
  }
  return <ChevronDown className="size-5" />;
};

export { Chevron };
