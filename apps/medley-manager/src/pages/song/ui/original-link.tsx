import type { ReactNode } from "react";

import { Button } from "#/shared/ui/button";

const OPEN_ORIGINAL = "原曲を開く ↗";

const OriginalLink = ({ url }: Readonly<{ url: string | null }>): ReactNode =>
  url !== null && (
    <Button asChild variant="outline">
      <a href={url} target="_blank" rel="noreferrer">
        {OPEN_ORIGINAL}
      </a>
    </Button>
  );

export { OriginalLink };
