import type { Draw, Look, Shot } from "@masseater.dev/video-kit";
import {
  Backdrop,
  Caption,
  Character,
  Credits,
  ShotPicture,
  imageOf,
  Sfx,
  TitleBar,
} from "@masseater.dev/video-kit";
import { Option, Record as Rec } from "effect";
import type { ReactNode } from "react";

const ZUNDAMON = [3, 1, 7, 5, 22, 38, 75, 76];
const METAN = [2, 0, 6, 4, 36, 37];

const POSES = {
  default: "zun-stand",
  surprise: "zun-cheer",
  switch: "zun-cheer",
  ending: "zun-wave",
};

const BORDER: Readonly<Record<string, string>> = {
  2: "[--outline:#e0479a]",
};

const TOPICS: Readonly<Record<string, string>> = {
  meaning: "どういう意味？",
  speed: "速さ",
  disk: "容量",
  caution: "注意点",
};

const pick = (record: Readonly<Record<string, string>>, key: string, fallback: string): string =>
  Option.getOrElse(Rec.get(record, key), () => fallback);

const Topic = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <div className="font-jp absolute inset-x-0 top-[400px] flex justify-center">
    <div className="rounded-full border-[6px] border-white bg-[#3aa53a] px-14 py-4 text-[72px] leading-none font-black text-white shadow-[0_8px_0_rgb(0_0_0/0.25)]">
      {text}
    </div>
  </div>
);

const Panel = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="absolute inset-x-[70px] top-[510px] flex h-[600px] items-center justify-center">
    {children}
  </div>
);

const SCREEN = "w-full rounded-2xl border-[6px] border-[#333] bg-white p-3";

const ILLUST = "h-[560px] w-[640px]";

const Pane = ({
  shot,
  name,
  className,
}: Readonly<{ shot: Shot; name: string; className: string }>): ReactNode => (
  <Panel>
    <ShotPicture className={className} name={name} shot={shot} />
  </Panel>
);

export const look: Partial<Look> = {
  backdrop: (timeline) => (
    <>
      <Backdrop src={imageOf("classroom")(timeline)} tone="dim" />
      <Character
        className="bottom-[-60px] left-[-60px] h-[1020px] w-[600px]"
        poses={POSES}
        timeline={timeline}
        voices={ZUNDAMON}
      />
      <Character
        className="right-[-50px] bottom-[-40px] h-[980px] w-[590px]"
        timeline={timeline}
        voices={METAN}
      />
    </>
  ),
  overlay: () => (
    <TitleBar
      className="caption-outline bg-[linear-gradient(#3b3b3b,#1f1f1f)] pt-12 pb-6 text-[116px] [--outline:#111] [--stroke:0.2em]"
      text={"最新ツール解説\n「pnpm」"}
    />
  ),
  frame: (shot, content) => (
    <>
      {Option.match(Rec.get(TOPICS, shot.id), {
        onNone: () => "",
        onSome: (text) => <Topic text={text} />,
      })}
      {content}
      <div className="absolute inset-x-[60px] top-[1400px] flex justify-center">
        <Caption
          className={`caption-box border-[10px] text-[80px] whitespace-pre-line [--emphasis:#e8202a] [--outline:#3aa53a] ${pick(BORDER, String(shot.voice), "")}`}
          shot={shot}
        />
      </div>
    </>
  ),
};

export const draw: Readonly<Record<string, Draw>> = {
  question: (shot) => (
    <>
      <Panel>
        <div className="font-jp flex flex-col items-center gap-6">
          <div className="border-[5px] border-[#222] bg-white px-10 py-3 text-[60px] font-black text-[#222]">
            どういう意味？
          </div>
          <div className="rounded-xl border-[8px] border-[#222] bg-white px-16 py-6 font-sans text-[170px] leading-none font-black text-[#222]">
            pnpm
          </div>
        </div>
      </Panel>
      <Sfx at={0} kind="hook" shot={shot} />
    </>
  ),
  meaning: () => (
    <Panel>
      <div className="font-jp flex w-full flex-col items-center gap-6 rounded-2xl border-[6px] border-[#222] bg-white px-12 py-10 text-[#222]">
        <div className="rounded-xl border-[5px] border-[#222] px-10 py-2 text-[64px] font-black">
          pnpm
        </div>
        <p className="text-[54px] leading-snug font-bold">
          Node.jsのパッケージを入れたり消したりするツール。npmより速く、容量も節約できる。
        </p>
      </div>
    </Panel>
  ),
  speed: (shot) => <Pane className={SCREEN} name="bench-clean" shot={shot} />,
  surprise: (shot) => (
    <>
      <Pane className={ILLUST} name="rocket" shot={shot} />
      <Sfx at={0} kind="pop" shot={shot} />
    </>
  ),
  disk: (shot) => <Pane className={SCREEN} name="pnpm-store" shot={shot} />,
  switch: (shot) => <Pane className={ILLUST} name="laptop_chara" shot={shot} />,
  caution: (shot) => <Pane className={ILLUST} name="headache" shot={shot} />,
  ending: (shot) => (
    <>
      <Pane className={ILLUST} name="guts" shot={shot} />
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="absolute inset-x-0 bottom-[20px]">
        <Credits shot={shot} />
      </div>
    </>
  ),
};
