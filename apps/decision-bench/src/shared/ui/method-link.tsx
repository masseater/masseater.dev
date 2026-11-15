import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";

const METHOD_URL = "https://masseater.dev/blogs/mst-ja-decision-bench#採点";
const METHOD_LABEL = "採点方法を見る";

export const MethodLink = (): ReactNode => (
  <a href={METHOD_URL} className="text-primary flex items-center gap-2 text-sm underline">
    <BookOpen aria-hidden="true" className="size-4" />
    {METHOD_LABEL}
  </a>
);
