import type { Draw, Look, Shot } from "@masseater.dev/video-kit";
import { Caption, Character, Credits, Picture, Sfx, imageOf } from "@masseater.dev/video-kit";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

const ZUNDAMON = [3, 1, 7, 5, 22, 38, 75, 76];
const METAN = [2, 0, 6, 4, 36, 37];

const POSES = { default: "zun-stand", intro: "zun-wave", fast: "zun-cheer", ending: "zun-wave" };

const OUTLINED = "caption-outline [--outline:#111] [--stroke:0.22em]";

const Stage = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="absolute inset-x-[50px] top-[450px] flex h-[660px] flex-col items-center justify-center gap-8">
    {children}
  </div>
);

const Card = ({ shot, name }: Readonly<{ shot: Shot; name: string }>): ReactNode => (
  <Stage>
    <Picture
      className="w-full rounded-xl bg-white p-4 shadow-[0_10px_0_rgb(0_0_0/0.25)]"
      src={imageOf(name)(shot)}
    />
  </Stage>
);

const Bullets = ({ items }: Readonly<{ items: readonly string[] }>): ReactNode => (
  <ul
    className={`font-jp flex flex-col gap-4 self-stretch text-[56px] leading-snug font-black ${OUTLINED}`}
  >
    {pipe(
      items,
      Arr.map((item) => <li key={item}>・{item}</li>),
    )}
  </ul>
);

export const look: Partial<Look> = {
  backdrop: (timeline) => (
    <>
      <AbsoluteFill className="bg-[repeating-conic-gradient(from_0deg_at_50%_42%,#ffd21a_0deg_9deg,#ffb800_9deg_18deg)]" />
      <Character
        className="bottom-[-300px] left-[-60px] h-[1080px] w-[560px]"
        poses={POSES}
        timeline={timeline}
        voices={ZUNDAMON}
      />
      <Character
        className="right-[-60px] bottom-[-280px] h-[1060px] w-[560px]"
        timeline={timeline}
        voices={METAN}
      />
    </>
  ),
  overlay: () => (
    <div className="font-jp absolute inset-x-[30px] top-[80px] rounded-3xl border-[6px] border-white bg-[#ff8a00] px-8 py-6 shadow-[0_10px_0_rgb(0_0_0/0.25)]">
      <div className={`text-[86px] leading-tight font-black whitespace-nowrap ${OUTLINED}`}>
        知っておきたい
        <br />
        パッケージ管理「pnpm」
      </div>
    </div>
  ),
  frame: (_shot, content) => content,
};

const WithCaption = ({
  shot,
  children,
}: Readonly<{ shot: Shot; children: ReactNode }>): ReactNode => (
  <>
    {children}
    <div className="absolute inset-x-[40px] top-[1130px] flex justify-center">
      <Caption
        className={`text-[60px] whitespace-pre-line ${OUTLINED} [--emphasis-outline:#1d6b1d] [--emphasis:#ffffff]`}
        shot={shot}
      />
    </div>
  </>
);

export const draw: Readonly<Record<string, Draw>> = {
  intro: (shot) => (
    <WithCaption shot={shot}>
      <Stage>
        <Picture
          className="h-[560px] w-[560px] rounded-3xl bg-white p-12 shadow-[0_10px_0_rgb(0_0_0/0.25)]"
          src={imageOf("pnpm")(shot)}
        />
      </Stage>
      <Sfx at={0} kind="hook" shot={shot} />
    </WithCaption>
  ),
  what: (shot) => (
    <WithCaption shot={shot}>
      <Stage>
        <div className="caption-outline font-sans text-[190px] leading-none font-black [--fill:#f69220] [--outline:#ffffff] [--stroke:0.12em]">
          pnpm
        </div>
        <Bullets items={["Node.js のパッケージを管理", "npm と同じコマンドで使える"]} />
      </Stage>
    </WithCaption>
  ),
  fast: (shot) => (
    <WithCaption shot={shot}>
      <Card name="bench-clean" shot={shot} />
      <Sfx at={0} kind="pop" shot={shot} />
    </WithCaption>
  ),
  store: (shot) => (
    <WithCaption shot={shot}>
      <Card name="pnpm-store" shot={shot} />
    </WithCaption>
  ),
  users: (shot) => (
    <WithCaption shot={shot}>
      <Stage>
        <div className="flex w-full flex-col items-center gap-6 rounded-xl bg-white px-10 py-12 font-sans text-[130px] leading-none font-black shadow-[0_10px_0_rgb(0_0_0/0.25)]">
          <span className="text-[#42b883]">Vue</span>
          <span className="text-[#646cff]">Vite</span>
          <span className="text-[#00dc82]">Nuxt</span>
        </div>
      </Stage>
    </WithCaption>
  ),
  ending: (shot) => (
    <WithCaption shot={shot}>
      <Stage>
        <Picture className="h-[600px] w-[700px]" src={imageOf("pc_worker")(shot)} />
      </Stage>
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="absolute inset-x-0 bottom-[20px]">
        <Credits shot={shot} />
      </div>
    </WithCaption>
  ),
};
