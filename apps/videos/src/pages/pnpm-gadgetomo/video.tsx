import type { Draw, Look } from "@masseater.dev/video-kit";
import { Caption, Credits, Footage, Sfx, Shout, Terminal, imageOf } from "@masseater.dev/video-kit";
import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

const Console = ({
  rows,
  at,
}: Readonly<{ rows: readonly string[]; at: readonly number[] }>): ReactNode => (
  <AbsoluteFill className="items-center justify-start bg-[#15171b] px-8 pt-[220px] [&>div]:scale-[1.15]">
    <Terminal at={at} rows={rows} />
  </AbsoluteFill>
);

const PUNCH = "caption-outline text-[230px] leading-none [--outline:#111] [--stroke:0.1em]";

export const look: Partial<Look> = {
  backdrop: () => <AbsoluteFill className="bg-black" />,
  overlay: () => "",
  frame: (shot, content) => (
    <>
      {content}
      <div className="absolute inset-x-[50px] top-[1020px] flex justify-center">
        <Caption
          className="caption-outline text-[68px] font-bold whitespace-pre-line [--outline:#111] [--stroke:0.2em]"
          shot={shot}
        />
      </div>
    </>
  ),
};

export const draw: Readonly<Record<string, Draw>> = {
  hook: (shot) => (
    <>
      <Footage shot={shot} src={imageOf("pnpm-bench2")(shot)} />
      <Sfx at={0} kind="hook" shot={shot} />
    </>
  ),
  try: () => (
    <Console
      at={[0, 24, 36, 44]}
      rows={[
        "$ pnpm add react vite typescript",
        "Packages: +18",
        "++++++++++++++++++",
        "Done in 4.6s using pnpm v12.23.0",
      ]}
    />
  ),
  wow: (shot) => (
    <>
      <Console
        at={[0, 0, 0, 0]}
        rows={[
          "$ pnpm add react vite typescript",
          "Packages: +18",
          "++++++++++++++++++",
          "Done in 4.6s using pnpm v12.23.0",
        ]}
      />
      <div className="absolute inset-x-0 top-[560px] flex justify-center">
        <Shout at={4} className={PUNCH} text="爆速" />
      </div>
      <Sfx at={4} kind="pop" shot={shot} />
    </>
  ),
  again: () => (
    <Console
      at={[0, 8, 16, 26]}
      rows={[
        "$ rm -rf node_modules",
        "$ pnpm install",
        "Packages: +18",
        "Done in 175ms using pnpm v12.23.0",
      ]}
    />
  ),
  disk: (shot) => <Footage shot={shot} src={imageOf("pnpm-motivation")(shot)} />,
  caveat: (shot) => <Footage shot={shot} src={imageOf("pnpm-bench")(shot)} />,
  ending: (shot) => (
    <>
      <Footage shot={shot} src={imageOf("pnpm-home")(shot)} />
      <div className="absolute inset-x-0 top-[560px] flex justify-center">
        <Shout at={10} className={PUNCH} text="卒業" />
      </div>
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="absolute inset-x-0 bottom-[20px]">
        <Credits shot={shot} />
      </div>
    </>
  ),
};
