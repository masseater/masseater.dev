import type { Draw, Look, Shot } from "@masseater.dev/video-kit";
import { Caption, Credits, Sfx, imageOf } from "@masseater.dev/video-kit";
import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

const SOFT = "drop-shadow-[0_3px_14px_rgb(120_90_0/0.75)]";

const Phone = ({
  shot,
  name,
  scroll = 0,
  tilt = "-rotate-6",
}: Readonly<{ shot: Shot; name: string; scroll?: number; tilt?: string }>): ReactNode => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, shot.duration], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center">
      <div
        className={`h-[1400px] w-[690px] overflow-hidden rounded-[96px] border-[20px] border-[#1d1d1f] bg-white shadow-[0_40px_80px_rgb(0_0_0/0.35)] ${tilt}`}
        style={{ translate: `0 ${String(330 - progress * 50)}px` }}
      >
        <Img
          className="w-full"
          src={imageOf(name)(shot)}
          style={{ translate: `0 ${String(-progress * scroll)}px` }}
        />
      </div>
    </AbsoluteFill>
  );
};

const Heading = ({ title, sub }: Readonly<{ title: string; sub: string }>): ReactNode => (
  <div className={`absolute top-[150px] left-[70px] flex flex-col text-white ${SOFT}`}>
    <span className="font-sans text-[170px] leading-none font-light tracking-tight">{title}</span>
    <span className="font-jp ml-3 text-[54px] font-medium">{sub}</span>
  </div>
);

export const look: Partial<Look> = {
  backdrop: () => (
    <AbsoluteFill className="bg-[radial-gradient(circle_at_30%_20%,#fff6b8,#f2d43c_70%)]" />
  ),
  overlay: () => "",
  frame: (shot, content) => (
    <>
      {content}
      <div className="absolute inset-x-[60px] bottom-[280px] flex justify-center">
        <Caption
          className="caption-plain text-[54px] font-medium tracking-[0.06em] [text-shadow:0_0_0.3em_rgb(0_0_0/0.85),0_0.05em_0.15em_rgb(0_0_0/0.9)]"
          shot={shot}
        />
      </div>
    </>
  ),
};

export const draw: Readonly<Record<string, Draw>> = {
  hook: (shot) => (
    <>
      <Phone name="pnpm-home" scroll={300} shot={shot} />
      <Heading sub="乗り換えてよかったツール" title="pnpm" />
      <Sfx at={0} kind="hook" shot={shot} />
    </>
  ),
  point1: (shot) => (
    <>
      <Phone name="pnpm-bench2" scroll={200} shot={shot} tilt="rotate-3" />
      <Heading sub="ポイント1" title="Fast" />
    </>
  ),
  point2: (shot) => (
    <>
      <Phone name="pnpm-motivation" scroll={160} shot={shot} />
      <Heading sub="ポイント2" title="Light" />
    </>
  ),
  point3: (shot) => (
    <>
      <Phone name="pnpm-bench" scroll={220} shot={shot} tilt="rotate-3" />
      <Heading sub="ポイント3" title="Easy" />
    </>
  ),
  ending: (shot) => (
    <>
      <Phone name="pnpm-home" shot={shot} />
      <Heading sub="npm install -g pnpm" title="pnpm" />
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="absolute inset-x-0 bottom-[20px]">
        <Credits shot={shot} />
      </div>
    </>
  ),
};
