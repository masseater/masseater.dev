import type { ReactNode } from "react";
import LiteYouTubeEmbed from "react-lite-youtube-embed";

import type { Example } from "#/entities/technique/model/technique";

const YouTubeExample = ({
  example,
}: Readonly<{ example: Extract<Example, Readonly<{ kind: "youtube" }>> }>): ReactNode => (
  <div className="overflow-hidden rounded-lg">
    <LiteYouTubeEmbed id={example.id} lazyLoad title={example.title} />
  </div>
);

export { YouTubeExample };
