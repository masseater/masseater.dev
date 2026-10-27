import type { ReactNode } from "react";
import LiteYouTubeEmbed from "react-lite-youtube-embed";

const YouTube = ({ id, title }: Readonly<{ id: string; title: string }>): ReactNode => (
  <div className="my-6 overflow-hidden rounded-lg">
    <LiteYouTubeEmbed id={id} lazyLoad title={title} />
  </div>
);

export { YouTube };
