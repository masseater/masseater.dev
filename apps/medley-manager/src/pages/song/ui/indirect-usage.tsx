import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { VideoList } from "#/entities/catalog";
import { useSong } from "#/pages/song/api/use-song";
import { describeIndirect } from "#/pages/song/lib/describe";
import { SectionHeading } from "#/shared/ui/section-heading";

const IndirectUsage = (): ReactNode => {
  const { indirect } = useSong();
  return (
    Arr.isReadonlyArrayNonEmpty(indirect) && (
      <section className="flex flex-col gap-4">
        <SectionHeading title="引用を経由して使った動画" count={indirect.length} />
        <VideoList videos={indirect} describe={describeIndirect} />
      </section>
    )
  );
};

export { IndirectUsage };
