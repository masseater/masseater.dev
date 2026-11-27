import type { Draw, Look, Shot } from "@masseater.dev/video-kit";
import {
  Caption,
  Credits,
  Footage,
  Picture,
  Sfx,
  Terminal,
  imageOf,
} from "@masseater.dev/video-kit";
import type { ReactNode } from "react";
import { AbsoluteFill, Img } from "remotion";

const Clip = ({
  shot,
  name,
  rise = 0,
  dim = "",
}: Readonly<{ shot: Shot; name: string; rise?: number; dim?: string }>): ReactNode => (
  <>
    <Footage className={dim} rise={rise} shot={shot} src={imageOf(name)(shot)} />
    <AbsoluteFill className="bg-[linear-gradient(transparent_40%,rgb(0_0_0/0.82)_68%)]" />
  </>
);

const Screen = ({ shot, name }: Readonly<{ shot: Shot; name: string }>): ReactNode => (
  <AbsoluteFill className="items-center justify-center overflow-hidden bg-[#1b1d21]">
    <Img
      className="absolute size-full scale-125 object-cover opacity-50 blur-3xl"
      src={imageOf(name)(shot)}
    />
    <Picture
      className="w-[1000px] rounded-2xl bg-white p-3 shadow-[0_30px_80px_rgb(0_0_0/0.5)]"
      src={imageOf(name)(shot)}
    />
  </AbsoluteFill>
);

export const look: Partial<Look> = {
  backdrop: () => <AbsoluteFill className="bg-black" />,
  overlay: () => "",
  frame: (shot, content) => (
    <>
      {content}
      <div className="absolute inset-x-[60px] top-[1240px] flex justify-center">
        <Caption className="caption-plain text-[50px] font-medium tracking-wide" shot={shot} />
      </div>
    </>
  ),
};

export const draw: Readonly<Record<string, Draw>> = {
  hook: (shot) => (
    <>
      <Clip name="pnpm-home" rise={60} shot={shot} />
      <Sfx at={0} kind="hook" shot={shot} />
    </>
  ),
  name: (shot) => (
    <>
      <Clip dim="brightness-[0.4] blur-[3px]" name="pnpm-motivation" shot={shot} />
      <AbsoluteFill className="items-center justify-end gap-6 pb-[720px]">
        <Picture
          className="size-[190px] rounded-[44px] bg-white p-8 shadow-[0_12px_40px_rgb(0_0_0/0.45)]"
          src={imageOf("pnpm")(shot)}
        />
        <div className="font-jp caption-plain text-[40px] font-medium">ピーエヌピーエム</div>
        <div className="caption-plain font-sans text-[150px] leading-none font-semibold italic">
          pnpm
        </div>
      </AbsoluteFill>
    </>
  ),
  speed: (shot) => (
    <>
      <Clip dim="brightness-[0.4] blur-[3px]" name="pnpm-bench2" rise={240} shot={shot} />
      <AbsoluteFill className="items-center justify-end pb-[780px]">
        <div className="font-jp caption-plain text-[44px] font-medium">クリーンインストール</div>
        <div className="caption-plain font-sans text-[96px] leading-tight font-semibold">
          npm 43.1s
        </div>
        <div className="caption-plain font-sans text-[96px] leading-tight font-semibold text-[#ffb347]">
          pnpm 4.03s
        </div>
      </AbsoluteFill>
    </>
  ),
  disk: (shot) => <Screen name="pnpm-store" shot={shot} />,
  install: () => (
    <AbsoluteFill className="items-center justify-center bg-[#1b1d21] px-10 [&>div]:scale-[1.25]">
      <Terminal
        at={[0, 20, 40, 50]}
        rows={[
          "$ npm install -g pnpm",
          "$ pnpm add react vite typescript",
          "Packages: +18",
          "Done in 4.6s using pnpm v12.23.0",
        ]}
      />
    </AbsoluteFill>
  ),
  ending: (shot) => (
    <>
      <Clip name="pnpm-home" shot={shot} />
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="absolute inset-x-0 bottom-[20px]">
        <Credits shot={shot} />
      </div>
    </>
  ),
};
