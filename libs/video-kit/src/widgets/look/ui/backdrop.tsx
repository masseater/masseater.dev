import type { ReactNode } from "react";
import { AbsoluteFill, Img } from "remotion";

export type BackdropTone = "photo" | "blur" | "dim";

const TONE: Readonly<Record<BackdropTone, string>> = {
  photo: "",
  blur: "backdrop-blur-photo",
  dim: "backdrop-dim-photo",
};

export const Backdrop = ({
  src,
  tone = "photo",
}: Readonly<{ src: string; tone?: BackdropTone }>): ReactNode => (
  <AbsoluteFill className="overflow-hidden">
    <Img className={`size-full object-cover ${TONE[tone]}`} src={src} />
  </AbsoluteFill>
);
