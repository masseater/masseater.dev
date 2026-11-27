import type { ReactNode } from "react";

import { ONE } from "#/shared/config/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { slamIn } from "#/shared/ui/motion.ts";

import { MediaSource } from "./media-source.tsx";

export const MediaCard = ({
  src,
  alt,
  frame,
}: Readonly<{ src: string; alt: string; frame: number }>): ReactNode => (
  <Box className="motion flex min-h-0 flex-1 flex-col gap-4" vars={slamIn({ frame, at: ONE })}>
    <MediaSource
      className="sticker min-h-0 max-w-full flex-1 self-center object-contain"
      src={src}
    />
    <p className="bg-telop font-text text-meta text-ink horizontal:text-meta-h self-start px-4 py-2 font-extrabold">
      {alt}
    </p>
  </Box>
);
