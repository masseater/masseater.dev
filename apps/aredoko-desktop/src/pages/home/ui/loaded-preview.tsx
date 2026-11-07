import type { SearchResult } from "@masseater.dev/aredoko-protocol";
import { ImageOff } from "lucide-react";
import type { ReactNode } from "react";

import { usePreview } from "#/pages/home/api/queries";

import { PreviewImage } from "./preview-image.tsx";

const LoadedPreview = ({ result }: Readonly<{ result: typeof SearchResult.Type }>): ReactNode => {
  const preview = usePreview(result.assetId);
  if (!preview.isSuccess) {
    return <ImageOff className="text-muted-foreground size-8" />;
  }
  return <PreviewImage source={preview.data} alt={result.pathname} />;
};

export { LoadedPreview };
