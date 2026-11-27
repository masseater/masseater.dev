import type { Draw, Look, Shot } from "@masseater.dev/video-kit";
import { Caption, Character, Credits, Picture, Sfx, imageOf } from "@masseater.dev/video-kit";
import type { ReactNode } from "react";
import { AbsoluteFill, Img } from "remotion";

const ZUNDAMON = [3, 1, 7, 5, 22, 38, 75, 76];
const POSES = { default: "zun-stand", trick: "zun-wave", speed: "zun-cheer", ending: "zun-wave" };

const OUTLINE = "caption-outline [--outline:#111] [--stroke:0.2em]";

const SCENE = "absolute inset-x-0 top-[430px] h-[608px] overflow-hidden";

const Scene = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className={`${SCENE} flex items-center gap-6 px-16 pb-20`}>{children}</div>
);

const Pic = ({
  shot,
  name,
  className = "h-[440px] w-[520px]",
}: Readonly<{ shot: Shot; name: string; className?: string }>): ReactNode => (
  <Picture className={className} src={imageOf(name)(shot)} />
);

const Tile = ({ src, text }: Readonly<{ src: string; text: string }>): ReactNode => (
  <div className="font-jp flex w-[470px] flex-col overflow-hidden rounded-lg border-4 border-white bg-white">
    <Img className="h-[330px] w-full object-cover object-top" src={src} />
    <div className="bg-[#0d1b4a] px-3 py-2 text-center text-[36px] leading-tight font-black text-white">
      {text}
    </div>
  </div>
);

export const look: Partial<Look> = {
  backdrop: (timeline) => (
    <>
      <AbsoluteFill className="bg-[#0d1b4a]" />
      <div className={`${SCENE} bg-[#f7f4ee]`} />
      <div className={SCENE}>
        <Character
          className="top-[40px] right-0 h-[640px] w-[420px]"
          poses={POSES}
          timeline={timeline}
          voices={ZUNDAMON}
        />
      </div>
    </>
  ),
  overlay: (timeline) => (
    <>
      <div className="font-jp absolute inset-x-0 top-0 flex h-[300px] flex-col items-center justify-end bg-[#e60012] pb-5 text-center">
        <div className={`text-[90px] leading-[1.1] font-black whitespace-nowrap ${OUTLINE}`}>
          容量不足を一発で解決！
          <br />
          開発者の裏技
        </div>
      </div>
      <div className="font-jp absolute inset-x-0 top-[300px] flex h-[130px] items-center justify-between bg-[#ffd200] pr-6 pl-8">
        <span className="text-[56px] font-black text-[#e60012]">知らないと損するpnpm</span>
        <Img
          className="h-[130px] w-[170px] self-end object-cover object-top"
          src={imageOf("zun-stand")(timeline)}
        />
      </div>
      <div className="font-jp absolute inset-x-0 top-[1080px] flex flex-col items-center gap-10 px-6">
        <div className="caption-outline text-center text-[132px] leading-[1.05] font-black [--fill:#ffe100] [--outline:#e60012] [--stroke:0.16em]">
          1分で必ず役立つ
          <br />
          開発の裏技
        </div>
        <div className="flex gap-6">
          <Tile src={imageOf("bench-clean")(timeline)} text="インストールが10倍速く" />
          <Tile src={imageOf("pnpm-store")(timeline)} text="容量がみるみる減る" />
        </div>
      </div>
    </>
  ),
  frame: (shot, content) => (
    <>
      {content}
      <div className="absolute inset-x-[30px] top-[930px] flex justify-center">
        <Caption
          className={`text-[46px] whitespace-pre-line ${OUTLINE} [--emphasis:#ffe100]`}
          shot={shot}
        />
      </div>
    </>
  ),
};

export const draw: Readonly<Record<string, Draw>> = {
  problem: (shot) => (
    <>
      <Scene>
        <Pic name="hdd_broken" shot={shot} />
      </Scene>
      <Sfx at={0} kind="hook" shot={shot} />
    </>
  ),
  cause: (shot) => (
    <Scene>
      <Pic name="boxes" shot={shot} />
    </Scene>
  ),
  trick: (shot) => (
    <>
      <Scene>
        <Pic className="h-[400px] w-[520px] rounded-2xl bg-white p-10" name="pnpm" shot={shot} />
      </Scene>
      <Sfx at={0} kind="pop" shot={shot} />
    </>
  ),
  how: (shot) => (
    <Scene>
      <Pic className="h-[460px] w-[640px] rounded-lg bg-white p-2" name="pnpm-store" shot={shot} />
    </Scene>
  ),
  speed: (shot) => (
    <Scene>
      <Pic className="h-[460px] w-[640px] rounded-lg bg-white p-2" name="bench-clean" shot={shot} />
    </Scene>
  ),
  start: (shot) => (
    <Scene>
      <Pic name="pc_worker" shot={shot} />
    </Scene>
  ),
  ending: (shot) => (
    <>
      <Scene>
        <Pic name="guts" shot={shot} />
      </Scene>
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="absolute inset-x-0 bottom-[10px]">
        <Credits shot={shot} />
      </div>
    </>
  ),
};
