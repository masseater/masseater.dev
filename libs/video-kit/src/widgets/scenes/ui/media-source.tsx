import { Video } from "@remotion/media";
import type { ReactNode } from "react";
import { Img, staticFile } from "remotion";

const VIDEO = /\.(?<extension>mp4|webm|mov)$/iu;

export const MediaSource = ({
  src,
  className,
}: Readonly<{ src: string; className: string }>): ReactNode => {
  if (VIDEO.test(src)) {
    return <Video className={className} muted src={staticFile(src)} />;
  }
  return <Img className={className} src={staticFile(src)} />;
};
