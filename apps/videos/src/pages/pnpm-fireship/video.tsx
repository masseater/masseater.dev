import type { Draw, Look, Shot } from "@masseater.dev/video-kit";
import { Credits, Picture, Sfx, imageOf } from "@masseater.dev/video-kit";
import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

const Split = ({
  shot,
  image,
  tone = "bg-[#3b82f6]",
  children,
}: Readonly<{ shot: Shot; image: string; tone?: string; children: ReactNode }>): ReactNode => (
  <>
    <div className="absolute inset-x-0 top-0 flex h-[960px] flex-col items-center justify-center gap-8 px-12 pt-24">
      {children}
    </div>
    <div
      className={`absolute inset-x-0 bottom-0 flex h-[960px] items-center justify-center overflow-hidden ${tone}`}
    >
      <Picture className="h-[1000px] w-[1080px] scale-110" src={imageOf(image)(shot)} />
    </div>
    <Sfx at={0} kind="pop" shot={shot} />
  </>
);

const Word = ({
  text,
  tone = "text-white",
}: Readonly<{ text: string; tone?: string }>): ReactNode => (
  <div
    className={`font-sans text-[170px] leading-none font-black tracking-tight uppercase ${tone}`}
  >
    {text}
  </div>
);

const RED = "text-[#ef5a5a]";
const SAVED_ONCE = "// saved once";
const UNDECLARED = '"not-in-package-json"';

const Code = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="font-code text-[64px] leading-snug text-[#e6e6e6]">{children}</div>
);

export const look: Partial<Look> = {
  backdrop: () => <AbsoluteFill className="bg-[#0f1014]" />,
  overlay: () => "",
  frame: (_shot, content) => content,
};

export const draw: Readonly<Record<string, Draw>> = {
  hook: (shot) => (
    <Split image="pc_worker" shot={shot} tone="bg-[#fbbf24]">
      <Code>
        <span className="text-[#c792ea]">$</span> npm install
      </Code>
      <Code>
        <span className="text-[#7f848e]">⠋ resolving...</span>
      </Code>
    </Split>
  ),
  answer: (shot) => (
    <Split image="rocket" shot={shot} tone="bg-[#38bdf8]">
      <Picture className="size-[260px] rounded-3xl bg-white p-8" src={imageOf("pnpm")(shot)} />
      <Word text="pnpm" />
    </Split>
  ),
  born: (shot) => (
    <Split image="programmer" shot={shot} tone="bg-[#a3e635]">
      <Word text="2016" />
    </Split>
  ),
  store: (shot) => (
    <Split image="boxes" shot={shot} tone="bg-[#f472b6]">
      <Word text="store" />
      <Code>~/.local/share/pnpm/store</Code>
    </Split>
  ),
  once: (shot) => (
    <Split image="hdd" shot={shot} tone="bg-[#facc15]">
      <Word text="1x" />
      <Code>
        <span className="text-[#82aaff]">react@19.3.1</span>{" "}
        <span className="text-[#7f848e]">{SAVED_ONCE}</span>
      </Code>
    </Split>
  ),
  link: (shot) => (
    <Split image="chain" shot={shot}>
      <Word text="hard link" />
      <Code>node_modules/.pnpm</Code>
    </Split>
  ),
  fast: (shot) => (
    <Split image="speedlines" shot={shot} tone="bg-[#7dd3fc]">
      <Word tone={RED} text="~10x" />
      <Code>
        npm <span className="text-[#ef5a5a]">43.1s</span> / pnpm{" "}
        <span className="text-[#c3e88d]">4.03s</span>
      </Code>
    </Split>
  ),
  phantom: (shot) => (
    <Split image="headache" shot={shot} tone="bg-[#ef4444]">
      <Word tone={RED} text="phantom deps" />
      <Code>
        <span className="text-[#c792ea]">import</span> x{" "}
        <span className="text-[#c792ea]">from</span>{" "}
        <span className="text-[#c3e88d]">{UNDECLARED}</span>
      </Code>
    </Split>
  ),
  ending: (shot) => (
    <>
      <Split image="guts" shot={shot} tone="bg-[#22c55e]">
        <Word text="pnpm" />
        <Word tone={RED} text="in 60s" />
      </Split>
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="absolute inset-x-0 bottom-[10px]">
        <Credits shot={shot} />
      </div>
    </>
  ),
};
