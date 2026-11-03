import {
  Activity,
  Archive,
  ChartLine,
  Database,
  FileText,
  KeyRound,
  Settings,
  ShieldBan,
  Timer,
  User,
  Waypoints,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  siClaude,
  siCloudflare,
  siCloudflareworkers,
  siDiscord,
  siGithub,
  siGithubactions,
  siGreasyfork,
  siModelcontextprotocol,
  siOpenrouter,
  siZap,
  siZenn,
} from "simple-icons";
import type { SimpleIcon } from "simple-icons";

import { ArchitectureBrandGlyph } from "./architecture-brand-glyph";

type Tone = "cf" | "gh";

type Glyph =
  | Readonly<{ kind: "brand"; icon: SimpleIcon }>
  | Readonly<{ kind: "line"; icon: LucideIcon }>;

const glyphs = {
  claude: { kind: "brand", icon: siClaude },
  cloudflare: { kind: "brand", icon: siCloudflare },
  workers: { kind: "brand", icon: siCloudflareworkers },
  discord: { kind: "brand", icon: siDiscord },
  github: { kind: "brand", icon: siGithub },
  actions: { kind: "brand", icon: siGithubactions },
  greasyfork: { kind: "brand", icon: siGreasyfork },
  mcp: { kind: "brand", icon: siModelcontextprotocol },
  openrouter: { kind: "brand", icon: siOpenrouter },
  zap: { kind: "brand", icon: siZap },
  zenn: { kind: "brand", icon: siZenn },
  activity: { kind: "line", icon: Activity },
  archive: { kind: "line", icon: Archive },
  chart: { kind: "line", icon: ChartLine },
  database: { kind: "line", icon: Database },
  file: { kind: "line", icon: FileText },
  key: { kind: "line", icon: KeyRound },
  settings: { kind: "line", icon: Settings },
  shield: { kind: "line", icon: ShieldBan },
  timer: { kind: "line", icon: Timer },
  user: { kind: "line", icon: User },
  waypoints: { kind: "line", icon: Waypoints },
} as const satisfies Record<string, Glyph>;

type GlyphName = keyof typeof glyphs;

const LINE_WIDTH = 1.8;

const ArchitectureGlyph = ({
  name,
  tone,
  size,
}: Readonly<{ name: GlyphName; tone: Tone; size: number }>): ReactNode => {
  const glyph: Glyph = glyphs[name];
  if (glyph.kind === "brand") {
    return <ArchitectureBrandGlyph hex={glyph.icon.hex} path={glyph.icon.path} size={size} />;
  }
  const Icon = glyph.icon;
  return <Icon className={`architecture-line-${tone}`} size={size} strokeWidth={LINE_WIDTH} />;
};

export type { GlyphName, Tone };
export { ArchitectureGlyph };
