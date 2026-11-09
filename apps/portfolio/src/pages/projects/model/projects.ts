type ProjectLink = Readonly<{ label: string; href: string }>;

type BlogRef = Readonly<{ category: "blogs"; slug: string }>;

const projectTags = ["site", "package", "plugin", "app", "mcp", "template", "skill"] as const;

type ProjectTag = (typeof projectTags)[number];

type Project = Readonly<{
  name: string;
  tags: readonly ProjectTag[];
  description: string;
  href: string;
  links: readonly ProjectLink[];
  blogs: readonly BlogRef[];
}>;

const SITE = "https://masseater.dev";
const GITHUB = "https://github.com/masseater";
const NPM = "https://www.npmjs.com/package";

const npm = (name: string): ProjectLink => ({ label: "npm", href: `${NPM}/${name}` });

const blog = (slug: string): BlogRef => ({ category: "blogs", slug });

const projects: readonly Project[] = [
  {
    name: "Pod Rattle",
    tags: ["site", "plugin"],
    description: "紐で吊った殻がぶつかる音を、録音を使わず物理演算とモーダル合成で鳴らすシンセ",
    href: `${SITE}/pod-rattle/`,
    links: [{ label: "VST3・CLAP", href: `${GITHUB}/masseater.dev/releases?q=pod-rattle` }],
    blogs: [],
  },
  {
    name: "夕景カット撮影ラボ",
    tags: ["site"],
    description: "アニメの「撮影」が 1 カットに何をしているかを、工程を切り替えて確かめるページ",
    href: `${SITE}/satsuei-lab/`,
    links: [],
    blogs: [],
  },
  {
    name: "背面打ちスプリットパッド",
    tags: ["site"],
    description: "ABXY と十字キーを背面に移した、左右分離型コントローラーの 3D モデル",
    href: `${SITE}/split-pad/`,
    links: [],
    blogs: [],
  },
  {
    name: "サムネのモザイクアート",
    tags: ["site"],
    description:
      "キャラクターの絵を、そのキャラクターを使った動画のサムネイルだけで描くモザイクアート",
    href: `${SITE}/mosaic/`,
    links: [],
    blogs: [],
  },
  {
    name: "メドDB",
    tags: ["site"],
    description: "ニコメドや合作動画で使われた曲と動画を逆引きするデータベース",
    href: "https://medley-manager.masseater.dev",
    links: [],
    blogs: [],
  },
  {
    name: "mirucord",
    tags: ["site", "mcp"],
    description:
      "自分が入っている Discord サーバーの過去の会話を、AI から探して読める MCP サーバー",
    href: "https://mirucord.masseater.dev",
    links: [],
    blogs: [],
  },
  {
    name: "injection-bisect",
    tags: ["site", "package"],
    description:
      "AI に渡す文書に紛れたプロンプトインジェクションを、decision モデルで見つけて場所を示す",
    href: `${SITE}/injection-bisect/`,
    links: [npm("@r_masseater/injection-bisect")],
    blogs: [blog("injection-bisect")],
  },
  {
    name: "ocr-decide",
    tags: ["site"],
    description: "請求書を OCR で読んだ断片を、decision モデルでどの項目かに割り当てる",
    href: `${SITE}/ocr-decide/`,
    links: [],
    blogs: [],
  },
  {
    name: "decision-bench",
    tags: ["site"],
    description: "decision model が日本語のタスクをどれだけ正しく判定できるかのリーダーボード",
    href: `${SITE}/decision-bench/`,
    links: [],
    blogs: [blog("mst-ja-decision-bench")],
  },
  {
    name: "rpp-kit",
    tags: ["site"],
    description: "REAPER のプロジェクトファイル（.rpp）を TypeScript から直接読むキット",
    href: `${SITE}/rpp-kit/`,
    links: [],
    blogs: [],
  },
  {
    name: "aredoko",
    tags: ["app"],
    description: "Unity エディタの中で、アセットを見た目の言葉で探す検索",
    href: `${GITHUB}/masseater.dev/releases?q=aredoko`,
    links: [],
    blogs: [],
  },
  {
    name: "konomi",
    tags: ["mcp"],
    description:
      "見た動画・聴いた曲・高評価を自分の Cloudflare に集め、AI が MCP で読めるようにする",
    href: `${GITHUB}/konomi`,
    links: [],
    blogs: [],
  },
  {
    name: "typescript-template",
    tags: ["template"],
    description:
      "検査・CI・デプロイがそろった、Cloudflare で動く TypeScript の Web アプリのテンプレート",
    href: `${GITHUB}/typescript-template`,
    links: [],
    blogs: [blog("typescript-template")],
  },
  {
    name: "lint-kit",
    tags: ["package"],
    description:
      "decision モデルが判定する Oxlint ルールなど、TypeScript のリポジトリ向けの lint の道具",
    href: `${GITHUB}/lint-kit`,
    links: [npm("@r_masseater/oxlint-plugin-decision")],
    blogs: [],
  },
  {
    name: "cc-jev-teacher",
    tags: ["plugin"],
    description: "Claude Code が仕事を終える前に「終わった」と報告するのを止めるプラグイン",
    href: `${GITHUB}/cc-jev-teacher`,
    links: [],
    blogs: [],
  },
  {
    name: "vitest-otlp",
    tags: ["package"],
    description: "テスト中に届いた OTLP のトレース・メトリクス・ログを Vitest で確かめるプラグイン",
    href: `${NPM}/@r_masseater/vitest-otlp`,
    links: [],
    blogs: [],
  },
  {
    name: "web-vitals-flow",
    tags: ["package"],
    description: "ページの読み込みとリンクでの遷移の Web Vitals を、Lighthouse の user flow で測る",
    href: `${NPM}/@r_masseater/web-vitals-flow`,
    links: [],
    blogs: [],
  },
  {
    name: "workers-tracing",
    tags: ["package"],
    description: "Effect・TanStack Start・Elysia のスパンを Cloudflare Workers のトレースに載せる",
    href: `${NPM}/@r_masseater/workers-tracing`,
    links: [],
    blogs: [],
  },
  {
    name: "sloppedia",
    tags: ["package"],
    description: "Markdown で書く個人の百科事典を Wikipedia 風の見た目にする部品",
    href: `${NPM}/sloppedia`,
    links: [],
    blogs: [],
  },
  {
    name: "skills",
    tags: ["skill"],
    description: "自分のリポジトリで共通に使うエージェントスキル",
    href: `${GITHUB}/skills`,
    links: [],
    blogs: [],
  },
  {
    name: "masseater.dev",
    tags: ["site"],
    description: "このサイトのソース",
    href: `${GITHUB}/masseater.dev`,
    links: [],
    blogs: [],
  },
];

export type { BlogRef, Project, ProjectLink, ProjectTag };
export { projects };
