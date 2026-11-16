import type { ReactNode } from "react";

import { Button } from "./button.tsx";
import { Input } from "./input.tsx";

const SUBMIT = "検索";

export const KeywordForm = ({
  action,
  label,
  keyword,
}: Readonly<{ action: string; label: string; keyword: string | undefined }>): ReactNode => (
  <form action={action} method="get" className="flex gap-2">
    <Input
      type="search"
      name="keyword"
      defaultValue={keyword}
      placeholder={label}
      aria-label={label}
    />
    <Button type="submit" size="lg">
      {SUBMIT}
    </Button>
  </form>
);
