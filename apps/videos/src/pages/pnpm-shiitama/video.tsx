import type { Draw, Look, Shot } from "@masseater.dev/video-kit";
import { Caption, Character, Credits, Sfx } from "@masseater.dev/video-kit";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

const ZUNDAMON = [3, 1, 7, 5, 22, 38, 75, 76];

const LOG = [
  "$ pnpm add react vite typescript",
  "Progress: resolved 0, reused 1, downloaded 0, added 0",
  "Packages are hard linked from the content-addressable store to the virtual store.",
  "  Content-addressable store is at: ~/.local/share/pnpm/store/v11",
  "  Virtual store is at:             node_modules/.pnpm",
  "Downloading @rolldown/binding-linux-x64-gnu@1.2.19: 8.83 MB",
  "Packages: +18",
  "++++++++++++++++++",
  "Progress: resolved 18, reused 13, downloaded 11, added 18, done",
  "",
  "dependencies:",
  "+ react 19.3.1",
  "+ typescript 7.0.2",
  "+ vite 8.3.8",
  "",
  "Done in 4.6s using pnpm v12.23.0",
  "$ ls node_modules/.pnpm",
  "@oxc-project+types@0.156.0",
  "@rolldown+binding-linux-x64-gnu@1.2.19",
  "@rolldown+pluginutils@1.1.1",
  "@typescript+typescript-linux-x64@7.0.2",
  "detect-libc@2.1.2",
  "fdir@6.5.0_picomatch@4.0.7",
  "lightningcss-linux-x64-gnu@1.33.0",
  "lightningcss@1.33.0",
  "nanoid@3.3.20",
  "picocolors@1.1.1",
  "picomatch@4.0.7",
  "postcss@8.5.33",
  "react@19.3.1",
  "rolldown@1.2.19",
  "source-map-js@1.2.4",
  "tinyglobby@0.2.17",
  "typescript@7.0.2",
  "vite@8.3.8",
  "$ rm -rf node_modules && pnpm install",
  "Packages: +18",
  "Progress: resolved 18, reused 24, downloaded 0, added 18, done",
  "Done in 175ms using pnpm v12.23.0",
];

const SCROLL_PER_FRAME = 1.6;

const Log = (): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill className="overflow-hidden bg-[#0b0d10]">
      <div
        className="font-code px-6 text-[34px] leading-[1.45] whitespace-pre text-[#8b949e] opacity-45"
        style={{ translate: `0 ${String(300 - frame * SCROLL_PER_FRAME)}px` }}
      >
        {pipe(
          [...LOG, ...LOG, ...LOG],
          Arr.map((row, index) => <div key={`${String(index)}:${row}`}>{row || " "}</div>),
        )}
      </div>
    </AbsoluteFill>
  );
};

const RED =
  "caption-outline text-[205px] leading-[1.0] tracking-[-0.06em] scale-x-[0.86] [--fill:#ff1e1e] [--outline:#2a0000] [--stroke:0.16em] [--emphasis:#ff1e1e] drop-shadow-[0_10px_0_rgb(0_0_0/0.8)]";
const BLUE =
  "caption-outline text-[118px] leading-tight [--fill:#ffffff] [--outline:#1238d6] [--stroke:0.2em]";

const Top = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <div
    className={`font-jp absolute inset-x-0 top-[110px] text-center font-black whitespace-pre-line ${BLUE}`}
  >
    {text}
  </div>
);

export const look: Partial<Look> = {
  backdrop: (timeline) => (
    <>
      <Log />
      <Character
        className="inset-x-0 bottom-[-160px] h-[980px]"
        poses={{ default: "zun-angry" }}
        timeline={timeline}
        voices={ZUNDAMON}
      />
    </>
  ),
  overlay: () => "",
  frame: (shot, content) => (
    <>
      {content}
      <div className="absolute inset-x-[20px] top-[440px] flex justify-center">
        <Caption className={`whitespace-pre-line ${RED}`} shot={shot} />
      </div>
    </>
  ),
};

export const draw: Readonly<Record<string, Draw>> = {
  hook: (shot: Shot) => <Sfx at={0} kind="hook" shot={shot} />,
  intro: () => <Top text={"今回紹介するのは\npnpm"} />,
  speed: (shot) => (
    <>
      <Top text="43秒 → 4秒" />
      <Sfx at={0} kind="pop" shot={shot} />
    </>
  ),
  cache: () => <Top text="Done in 175ms" />,
  link: () => <Top text="hard link" />,
  why: () => <Top text="store/v11" />,
  catch: () => <Top text={"node_modulesが\nフラットじゃない"} />,
  ending: (shot) => (
    <>
      <Top text={"本日のツール\npnpm"} />
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="absolute inset-x-0 bottom-[20px]">
        <Credits shot={shot} />
      </div>
    </>
  ),
};
