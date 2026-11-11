// yomiyasu_lint.py（nanaism/yomiyasu 2.5.0）の lint_text のうち、--strict が落とす warn と error の規則を写したもの。
// 文書の種類・読者・語の一覧は指定しないときの動きだけを写し、info の規則と点数と直し方の案の組み立ては写していない。
import { EXPLICIT_VARIATION_BASES, FLAG_REGION_CODES, OTHER_BASES, REGISTERED_TEXT_BASES } from "./emoji-data.ts";
import {
  analyzeMarkdown,
  bisectRight,
  lineVisibleText,
  pyLstrip,
  pyRstrip,
  pyStrip,
  rangeOverlapsProtected,
  stripChars,
  unicodeWhitespace,
} from "./markdown-visibility.ts";
import type { Analysis, Row } from "./markdown-visibility.ts";
import { finditer, match, pattern, search, sub } from "./py-re.ts";
import type { Match, Pattern } from "./py-re.ts";

type Severity = "error" | "warn";
type Finding = { rule: string; line: number; severity: Severity; message: string; snippet: string };
type Range = readonly [number, number];

const PY_SPACE = /^[\s\u001c-\u001f\u0085]$/u;
const isSpace = (ch: string | undefined): boolean => ch !== undefined && ch !== "" && PY_SPACE.test(ch);
const isAllSpace = (text: string): boolean => text !== "" && [...text].every((ch) => isSpace(ch));
const removeSpaces = (text: string): string => text.replace(/[\s\u001c-\u001f\u0085]+/gu, "");
const cpLen = (text: string): number => {
  let count = 0;
  for (const _ of text) count += 1;
  return count;
};
const isAlnum = (ch: string | undefined): boolean => ch !== undefined && /^[\p{L}\p{N}]$/u.test(ch);
const lstrip = pyLstrip;
const rstrip = pyRstrip;
const countOf = (text: string, needle: string): number => text.split(needle).length - 1;

// text[position - 1] から始まる 1 字（サロゲートの組なら 2 つ）を返す
const charBefore = (text: string, position: number): string => {
  const low = text.charCodeAt(position - 1);
  if (low >= 0xdc00 && low <= 0xdfff && position >= 2) {
    const high = text.charCodeAt(position - 2);
    if (high >= 0xd800 && high <= 0xdbff) return text.slice(position - 2, position);
  }
  return text.charAt(position - 1);
};
const charAt = (text: string, position: number): string => String.fromCodePoint(text.codePointAt(position) ?? 0);

// ---- 絵文字 ----
const escapedCodePoint = (cp: number): string =>
  cp <= 0xffff ? `\\u${cp.toString(16).padStart(4, "0")}` : `\\U${cp.toString(16).padStart(8, "0")}`;
const emojiCharacterClass = (ranges: readonly Range[]): string =>
  `[${ranges.map(([lo, hi]) => (lo === hi ? escapedCodePoint(lo) : `${escapedCodePoint(lo)}-${escapedCodePoint(hi)}`)).join("")}]`;

const emojiFlagPattern = (): string => {
  const seconds = new Map<string, Set<string>>();
  for (const code of FLAG_REGION_CODES) {
    const set = seconds.get(code[0]!) ?? new Set<string>();
    set.add(code[1]!);
    seconds.set(code[0]!, set);
  }
  const groups: string[] = [];
  const base = 0x1f1e6 - "A".charCodeAt(0);
  for (const first of [...seconds.keys()].sort()) {
    const firstCp = base + first.charCodeAt(0);
    const secondCps = [...seconds.get(first)!].sort().map((ch) => base + ch.charCodeAt(0));
    groups.push(
      emojiCharacterClass([[firstCp, firstCp]]) + emojiCharacterClass(secondCps.map((cp) => [cp, cp] as const)),
    );
  }
  return `(?:${groups.join("|")})`;
};

const EMOJI_PATTERN = pattern(
  `(?:${emojiFlagPattern()}` +
    String.raw`|[0-9#*]️⃣` +
    `|${emojiCharacterClass(EXPLICIT_VARIATION_BASES)}${String.raw`️`}` +
    `|${emojiCharacterClass(REGISTERED_TEXT_BASES)}${String.raw`(?!︎)`}` +
    `|${emojiCharacterClass(OTHER_BASES)})`,
);
const EMOJI_START_PATTERN = pattern(
  String.raw`[0-9#*](?=️⃣)|[©-⿿〰〽㊗㊙\U0001f000-\U0001faff]`,
);

const emojiMatches = (text: string): string[] => {
  const matches: string[] = [];
  let previousEnd = 0;
  for (const start of finditer(EMOJI_START_PATTERN, text)) {
    if (start.start < previousEnd) continue;
    const found = match(EMOJI_PATTERN, text, start.start);
    if (found !== undefined) {
      matches.push(found.group()!);
      previousEnd = found.end;
    }
  }
  return matches;
};

// ---- 文末の飾り ----
const mergedRanges = (ranges: readonly Range[]): Range[] => {
  const merged: [number, number][] = [];
  for (const [low, high] of [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    const last = merged.at(-1);
    if (last && low <= last[1] + 1) last[1] = Math.max(last[1], high);
    else merged.push([low, high]);
  }
  return merged;
};

const END_SYMBOL_RANGES: readonly Range[] = [
  [0x2600, 0x27bf],
  [0x2b05, 0x2b07],
  [0x2b1b, 0x2b1c],
  [0x2b50, 0x2b50],
  [0x2b55, 0x2b55],
  [0x231a, 0x231b],
  [0x23e9, 0x23fa],
  [0x2934, 0x2935],
  [0x3297, 0x3297],
  [0x3299, 0x3299],
  [0x1f000, 0x1faff],
];
const END_JOINER_RANGES: readonly Range[] = [
  [0xfe0e, 0xfe0f],
  [0x200d, 0x200d],
  [0xe0020, 0xe007f],
];
const END_VISIBLE_RANGES = mergedRanges([
  ...END_SYMBOL_RANGES,
  ...EXPLICIT_VARIATION_BASES,
  ...REGISTERED_TEXT_BASES,
  ...OTHER_BASES,
  [0x1f1e6, 0x1f1ff],
]);
const END_VISIBLE_CHARS = emojiCharacterClass(END_VISIBLE_RANGES).slice(1, -1);
const END_JOINER_CHARS = emojiCharacterClass(END_JOINER_RANGES).slice(1, -1);
const END_DECORATION_CHARS = END_VISIBLE_CHARS + END_JOINER_CHARS;
const END_DECORATION_CHAR = pattern(`[${END_DECORATION_CHARS}]`);
const END_KEYCAP = String.raw`[0-9#*]️?⃣`;
const END_DECORATION_RUN = `(?:${END_KEYCAP}|[\\s${END_DECORATION_CHARS}])*`;
const END_BRACKETS: Record<string, string> = { "）": "（", ")": "(", "】": "【", "〕": "〔", "〉": "〈", "》": "《", "］": "［" };
const END_CLOSERS = `${Object.keys(END_BRACKETS).join("")}←↑→↓〜～`;
const END_QUOTES: Record<string, string> = { "」": "「", "』": "『", "”": "“", "’": "‘", '"': '"', "'": "'" };
const END_MARKS = "。．！？!?";
const END_BRACKET_AFTER_PREDICATE = pattern(String.raw`(?:です|ます|でした|ました|ません|ない|だ|た|る)$`);

const isDecorationChar = (ch: string): boolean => match(END_DECORATION_CHAR, ch) !== undefined;

const bracketOpensSentence = (text: string, position: number, closer: string): boolean => {
  const opener = END_BRACKETS[closer]!;
  const floor = Math.max(0, position - 256);
  let depth = 0;
  let index = position;
  while (index > floor) {
    index -= 1;
    const ch = text[index];
    if (ch === closer) depth += 1;
    else if (ch === opener) {
      if (depth) {
        depth -= 1;
        continue;
      }
      let before = index;
      while (before > floor && (isSpace(text[before - 1]) || isDecorationChar(charBefore(text, before)))) before -= 1;
      if (!before) return true;
      if (before <= floor) return false;
      if (END_MARKS.includes(text[before - 1]!)) return true;
      return END_BRACKET_AFTER_PREDICATE.anywhere.test(text.slice(Math.max(0, before - 3), before));
    }
  }
  return false;
};

const stripEndDecoration = (text: string, closers = ""): string => {
  let position = text.length;
  const marks: string[] = [];
  let removed = false;
  while (position) {
    const ch = charBefore(text, position);
    if (END_MARKS.includes(ch)) {
      marks.push(ch);
      position -= 1;
    } else if (ch === "⃣") {
      removed = true;
      position -= 1;
      if (position && text[position - 1] === "️") position -= 1;
      if (position && "0123456789#*".includes(text[position - 1]!)) position -= 1;
    } else if (isSpace(ch) || isDecorationChar(ch)) {
      removed = true;
      position -= ch.length;
    } else if (closers.includes(ch) && (!(ch in END_BRACKETS) || bracketOpensSentence(text, position - 1, ch))) {
      removed = true;
      position -= ch.length;
    } else break;
  }
  if (!removed) return text;
  return text.slice(0, position) + marks.reverse().join("");
};

const END_BREAK_RUN = pattern(
  `(?:${END_KEYCAP}|[${END_VISIBLE_CHARS}])(?:${END_KEYCAP}|[\\s${END_DECORATION_CHARS}])*`,
);
const END_BREAK_CONTINUES = pattern(
  String.raw`(?:と|って|の|を|が|は|に|へ|や|か|から|まで|より|など|だけ|で(?![はも])|も(?!ちろん|し|っと|う)|ー)`,
);
const END_BREAK_HEAD_CHARS = "はがをのにでとへやも、，,：:";
const END_BREAK_PAIRS: readonly (readonly [string, string])[] = [
  ["「", "」"],
  ["『", "』"],
  ["（", "）"],
  ["(", ")"],
  ["【", "】"],
  ["“", "”"],
  ["［", "］"],
  ["[", "]"],
];

const decorationBreaks = (sentence: string): string[] | undefined => {
  if (search(END_DECORATION_CHAR, sentence) === undefined) return undefined;
  const pieces: string[] = [];
  let start = 0;
  let scanned = 0;
  let balance = END_BREAK_PAIRS.map(() => 0);
  let hasText = false;
  const length = sentence.length;
  for (const run of finditer(END_BREAK_RUN, sentence)) {
    const segment = sentence.slice(scanned, run.start);
    scanned = run.start;
    if (segment) {
      hasText = hasText || !isAllSpace(segment);
      balance = balance.map((value, index) => {
        const [open, close] = END_BREAK_PAIRS[index]!;
        return value + countOf(segment, open) - countOf(segment, close);
      });
    }
    const end = run.end;
    let word = end;
    while (word < length && "*_".includes(sentence[word]!)) word += 1;
    if (word >= length || !isAlnum(charAt(sentence, word)) || match(END_BREAK_CONTINUES, sentence, word) !== undefined) {
      continue;
    }
    let last = run.start;
    while (last > start && isSpace(sentence[last - 1])) last -= 1;
    if (!hasText || last === start || END_BREAK_HEAD_CHARS.includes(sentence[last - 1]!) || balance.some((value) => value > 0)) {
      continue;
    }
    pieces.push(sentence.slice(start, end));
    start = end;
    scanned = end;
    balance = END_BREAK_PAIRS.map(() => 0);
    hasText = false;
  }
  if (!pieces.length) return undefined;
  pieces.push(sentence.slice(start));
  return pieces;
};

const withUndecorated = (sentences: readonly string[], closers = END_CLOSERS): string[] => {
  const result = [...sentences];
  for (const sentence of sentences) {
    const core = stripEndDecoration(sentence, closers);
    if (core !== sentence) result.push(core);
    for (const piece of decorationBreaks(sentence) ?? []) result.push(stripEndDecoration(piece, closers));
  }
  return result;
};

// ---- 地の文の見え方 ----
const METRIC_OPAQUE_KINDS = [
  "code",
  "frontmatter",
  "html_block",
  "reference_definition",
  "inline_code",
  "html_token",
  "autolink",
  "link_destination",
  "image",
  "bare_url",
];
const PROSE_SCAN_KINDS = [...METRIC_OPAQUE_KINDS, "container_prefix"];
const PROTECTED_ROWS = new Set(["code", "frontmatter", "html_block", "reference_definition"]);

const proseVisibleText = (analysis: Analysis, lineNo: number): string => lineVisibleText(analysis, lineNo, PROSE_SCAN_KINDS);

const imageOnlyRow = (analysis: Analysis, row: Row, visible: string): boolean => {
  if (!pyStrip(visible)) return rangeOverlapsProtected(analysis, row.start, row.start + row.raw.length, ["image"]);
  const raw = row.raw;
  if (!pyStrip(raw).startsWith("[![")) return false;
  let indexes = analysis._image_link_start_indexes as readonly [Map<number, number>, Map<number, number>] | undefined;
  if (indexes === undefined) {
    const images = new Map<number, number>();
    const destinations = new Map<number, number>();
    for (const [left, right, kind] of analysis.protected_spans) {
      if (kind === "image") images.set(left, right);
      else if (kind === "link_destination") destinations.set(left, right);
    }
    indexes = [images, destinations];
    analysis._image_link_start_indexes = indexes;
  }
  const [images, destinations] = indexes;
  const start = row.start + raw.length - lstrip(raw).length;
  const end = row.start + rstrip(raw).length;
  const imageEnd = images.get(start + 1);
  return imageEnd !== undefined && analysis.text.slice(imageEnd, imageEnd + 2) === "](" && destinations.get(imageEnd + 1) === end;
};

const skipsAsImage = (analysis: Analysis, row: Row, visible: string): boolean =>
  (!pyStrip(visible) || lstrip(row.raw).startsWith("[![")) && imageOnlyRow(analysis, row, visible);

const endQuoteClosers = (analysis: Analysis): Map<number, string> => {
  const allowed = new Map<number, string>();
  const openers = [...new Set(Object.values(END_QUOTES))];
  for (const block of analysis.blocks) {
    if (block.kind !== "paragraph" && block.kind !== "list") continue;
    const counts = new Map(openers.map((opener) => [opener, 0]));
    for (const row of block.lines) {
      const visible = proseVisibleText(analysis, row.line);
      for (const opener of openers) counts.set(opener, counts.get(opener)! + countOf(visible, opener));
      const chars = Object.entries(END_QUOTES)
        .filter(([closer, opener]) => visible.includes(closer) && counts.get(opener) === (closer === opener ? 1 : 0))
        .map(([closer]) => closer)
        .join("");
      if (chars) allowed.set(row.line, chars);
    }
  }
  return allowed;
};

const endClosersFor = (analysis: Analysis, lineNo: number): string => {
  let allowed = analysis._end_quote_closers as Map<number, string> | undefined;
  if (allowed === undefined) {
    allowed = endQuoteClosers(analysis);
    analysis._end_quote_closers = allowed;
  }
  return END_CLOSERS + (allowed.get(lineNo) ?? "");
};

// ---- 語彙 ----
const SLOP_WORDS = [
  "手触り",
  "肌感",
  "肌感覚",
  "体温",
  "温度感",
  "熱量",
  "血の通った",
  "泥臭い",
  "泥臭さ",
  "解像度",
  "腹落ち",
  "メンタルモデル",
  "本質的",
  "地に足のついた",
  "等身大",
  "営み",
  "土台",
  "羅針盤",
  "起爆剤",
  "触媒",
  "虚飾",
  "境地",
  "美学",
  "深淵",
  "冷徹",
  "禁欲的",
  "優美",
  "極致",
  "宿命",
  "正本",
];

const TRUTH_PATTERN = String.raw`真理(?!値|表|関数|条件|集合|子|恵|奈|亜|絵|江|さん|ちゃん|様)`;
const DEVICE_LITERAL_PREFIXES = `安全 制御 記憶 表示 入力 出力 測定 計測 冷却 加熱 照明 通信 医療 実験
警報 処理 演算 記録 検出 検知 検査 分析 試験 製造 発電 変電 駆動 制動
操舵 推進 噴射 点火 排気 換気 空調 暖房 冷房 冷凍 浄化 濾過 給水 排水
消火 防火 防犯 監視 撮影 投影 映写 音響 録音 受信 送信 中継 露光 洗浄
乾燥 粉砕 搬送 昇降 分離 蒸留 電源 補助 予備 非常 救命 維持 透析 照射
診断 治療 計算 周辺 端末 遮断 保護 防護 防止 固定 連結 緩衝 減速 変速
蓄電 充電 給電 印刷 複写 読取 走査 識別 認証 暗号 圧縮 自動 遠隔 計量
包装 溶接 切断 加工 研磨 塗装 成形 射出 送風 集塵 加湿 除湿 殺菌 滅菌
培養 撹拌 混合 選別 航法 着陸 発射 照準 起爆 時限 発光 警告 信号 制震
免震 防振 保安 調整 調節 変換 変圧 整流 発振 映像 画像 光学 電子 油圧
空圧 真空 排煙 消音 防音 供給 回収 循環 浄水 揚水 貯蔵 運搬 牽引 計装
電波 音波 取り 読取り`.split(/\s+/u);
const pySorted = (values: readonly string[]): string[] =>
  [...values].sort((a, b) => {
    const left = [...a].map((ch) => ch.codePointAt(0)!);
    const right = [...b].map((ch) => ch.codePointAt(0)!);
    for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
      if (left[index] !== right[index]) return left[index]! - right[index]!;
    }
    return left.length - right.length;
  });
const DEVICE_PATTERN =
  String.raw`(?:(?<![ァ-ヴーA-Za-z0-9０-９Ａ-Ｚａ-ｚ線])|(?<=イデオロギー))` +
  [2, 3].map((size) => `(?<!${pySorted(DEVICE_LITERAL_PREFIXES.filter((word) => cpLen(word) === size)).join("|")})`).join("") +
  String.raw`装置(?![^。！？!?]{0,20}?(?:電源|起動|停止|配線|ケーブル|スイッチ|ボタン|ランプ|点検|修理|故障|稼働` +
  String.raw`|作動|設置|取扱|取り扱|保守|校正|電池|電圧|電流))`;
const SLOP_WORD_PATTERNS: readonly (readonly [string, Pattern])[] = [
  [
    "ゲート",
    pattern(
      String.raw`(?:(?<![ァ-ヴー])|(?<=レビュー)|(?<=リリース)|(?<=チェック)|(?<=デプロイ)|(?<=マージ)|(?<=テスト))` +
        String.raw`(?<!搭乗)(?<!改札)ゲート(?!ウ[ェエ]イ|ボール|キーパー)`,
    ),
  ],
  ["閉包", pattern(String.raw`(?<!推移)(?<!反射)(?<!対称)(?<!凸)(?<!代数)(?<!代数的)閉包(?!演算)`)],
  [
    "台帳",
    pattern(
      String.raw`(?<!資産)(?<!住民基本)(?<!会計)(?<!会計の)(?<!行政の)(?<!課税)(?<!土地)(?<!家屋)(?<!備品)(?<!登記)台帳`,
    ),
  ],
  ["〜のOS", pattern(String.raw`(思考|意思決定|仕事|人生|組織|チーム|学習|経営)の?OS(?![A-Za-z])`)],
  ["本質を突く", pattern(String.raw`本質を突`)],
  ["真理", pattern(TRUTH_PATTERN)],
  ["装置", pattern(DEVICE_PATTERN)],
];

const PUBLICATION_AFTER = String.raw`(?!(?![版化時後前])[一-龥々ァ-ヴーA-Za-z0-9０-９Ａ-Ｚａ-ｚ])`;
const PUBLICATION_WORDS =
  String.raw`(?:(?<![ァ-ヴーA-Za-z0-9０-９Ａ-Ｚａ-ｚ])` +
  String.raw`(?:辞書|辞典|事典|図鑑|書籍|文庫|全集|単行本|雑誌|教科書|絵本|新聞|増刷|重版|改訂|改版|初版` +
  String.raw`|刊行|出版|版元|訳書|冊子|写真集|画集|詩集|歌集|句集|作品集|論文集|選集|叢書|出版物|刊行物` +
  String.raw`|第[0-9０-９一二三四五六七八九十百]+版)` +
  String.raw`|(?<![一-龥々ァ-ヴーA-Za-z0-9０-９Ａ-Ｚａ-ｚ])(?:本書|原書|新書))` +
  PUBLICATION_AFTER +
  String.raw`|(?<![一-龥々0-9０-９])本(?![一-龥々ァ-ヴーA-Za-z0-9０-９Ａ-Ｚａ-ｚ])`;
const VERSION_DEMONSTRATIVE_PATTERN =
  String.raw`(?:^|(?<=[。．！？!?]))(?:(?!` +
  PUBLICATION_WORDS +
  String.raw`)[^。．！？!?])*?` +
  String.raw`(この|その|あの|新しい|古い|最新の|前の|次の|今の|現在の|以前の)版(では|で|に|から|を|が|へ|の)`;
const TRANSLATED_TERM_PATTERNS: readonly (readonly [Pattern, string])[] = [
  [pattern(VERSION_DEMONSTRATIVE_PATTERN), "「版」（version）"],
  [pattern(String.raw`(?<![一-龥ァ-ヴーA-Za-z0-9])版を(上げ|下げ|更新|戻)`), "「版」（version）"],
  [pattern(String.raw`(?<!原点)(?<!への)(?<!先祖)(?<!平均)回帰(が|を)(出|発生|起こ|起き|生じ|防)`), "「回帰」（regression）"],
];

// ---- ダッシュ ----
const DASH_CHARS = "—―─━";
const DASH_RUN = pattern(`[${DASH_CHARS}]+`);
const DIAGRAM_CHARS = pattern(String.raw`[│┃├┣└┗┌┏┐┓┘┛┬┳┴┻┼╋╭╮╰╯]`);
const LIST_ITEM = String.raw`[^、。！？!?\s` + DASH_CHARS + "]{1,12}";
const DASH_LIST_ENDING = pattern(
  String.raw`(?:^|(?<=[。！？!?]))\s*` +
    LIST_ITEM +
    "(?:、[ \\t　]*" +
    LIST_ITEM +
    "){2,}[ \\t　]*[" +
    DASH_CHARS +
    "]+" +
    END_DECORATION_RUN +
    "(?:[。．.]|$)",
);
const ATTRIBUTION_LABEL = pattern(String.raw`^(?:出典|引用元|著者|Source|Author)\s*[:：]`, "i");
const ATTRIBUTION_BOOK = pattern(String.raw`^[一-龥々ァ-ヴーA-Za-z .・'’-]+『[^』]+』(?:[ \t　]*(?:（[^）]*）|\([^)]*\)))*[。.]?$`);
const ATTRIBUTION_ENGLISH = pattern(String.raw`^[A-Z][A-Za-z.'’−-]*(?:[ \t]+[A-Z][A-Za-z.'’−-]*)+,[ \t]+\S`);
const NON_ROUTE_ENDINGS = [
  "人間",
  "時間",
  "期間",
  "空間",
  "世間",
  "仲間",
  "手間",
  "目線",
  "視線",
  "動線",
  "光線",
  "伏線",
  "生命線",
  "方便",
  "利便",
  "不便",
];
const DASH_INSERTION = pattern(`[${DASH_CHARS}]{1,2}[^${DASH_CHARS}。\\n]{1,40}[${DASH_CHARS}]{1,2}`);
const DASH_FINDING_LIMIT = 3;
const DASH_RULES = new Set(["dash_list_ending", "dash_insertion", "dash_decoration"]);
const LINK_ATTRIBUTION = pattern(String.raw`\][ \t]*[` + DASH_CHARS + "]+");

const isDashAttribution = (value: string): boolean => {
  const text = pyStrip(value);
  if (!text || !DASH_CHARS.includes(text[0]!)) return false;
  const credit = text.replace(new RegExp(`^[${DASH_CHARS} \\t　]+`, "u"), "");
  return (
    match(ATTRIBUTION_LABEL, credit) !== undefined ||
    match(ATTRIBUTION_BOOK, credit) !== undefined ||
    match(ATTRIBUTION_ENGLISH, credit) !== undefined
  );
};

const QUOTE_CLOSING: Record<string, string> = { "「": "」", "『": "』", "[": "]" };

const maskQuotedSegments = (text: string): string => {
  const stacks = new Map(Object.values(QUOTE_CLOSING).map((closer) => [closer, [] as number[]]));
  const changes = new Map<number, number>();
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index]!;
    if (ch in QUOTE_CLOSING) stacks.get(QUOTE_CLOSING[ch]!)!.push(index);
    else {
      const stack = stacks.get(ch);
      if (stack?.length) {
        const start = stack.pop()!;
        changes.set(start, (changes.get(start) ?? 0) + 1);
        changes.set(index + 1, (changes.get(index + 1) ?? 0) - 1);
      }
    }
  }
  if (!changes.size) return text;
  const pieces: string[] = [];
  let depth = 0;
  let cursor = 0;
  for (const point of [...changes.keys()].sort((a, b) => a - b)) {
    if (!changes.get(point)) continue;
    pieces.push(depth ? " ".repeat(point - cursor) : text.slice(cursor, point));
    cursor = point;
    depth += changes.get(point)!;
  }
  pieces.push(depth ? " ".repeat(text.length - cursor) : text.slice(cursor));
  return pieces.join("");
};

const nounChar = (ch: string | undefined): boolean =>
  ch !== undefined && (("一" <= ch && ch <= "龥") || ("ァ" <= ch && ch <= "ヴ") || "ー々".includes(ch));

const maskRouteDashes = (text: string): string => {
  const result = text.split("");
  for (const found of finditer(DASH_RUN, text)) {
    const left = found.start;
    const right = found.end;
    if (right - left !== 1 || left === 0 || right === text.length) continue;
    if (!nounChar(text[left - 1]) || !nounChar(text[right])) continue;
    let end = right;
    while (end < text.length && nounChar(text[end])) end += 1;
    const destination = text.slice(right, end);
    for (let index = 0; index < destination.length; index += 1) {
      if (!"間線便".includes(destination[index]!)) continue;
      const stop = index + 1;
      const head = destination.slice(0, stop);
      const suffixLength = head.endsWith("区間") ? 2 : 1;
      if (stop > suffixLength && !NON_ROUTE_ENDINGS.some((ending) => head.endsWith(ending))) {
        result[left] = " ";
        break;
      }
    }
  }
  return result.join("");
};

const PSZ = /^[\p{P}\p{S}\p{Z}]$/u;

const dashFinding = (value: string, lineNo: number, snippet: string): Finding | undefined => {
  if (search(DASH_RUN, value) === undefined) return undefined;
  let text = value;
  if (isDashAttribution(text)) text = lstrip(text).replace(new RegExp(`^[${DASH_CHARS}]+`, "u"), "");
  text = pyStrip(maskRouteDashes(maskQuotedSegments(sub(LINK_ATTRIBUTION, "]", text))));
  const rest = stripChars(text, `${DASH_CHARS} 　`);
  if (search(DASH_RUN, text) === undefined || search(DIAGRAM_CHARS, text) !== undefined || !rest) return undefined;
  if ([...rest].every((ch) => PSZ.test(ch) || DASH_CHARS.includes(ch))) return undefined;
  let rule: string;
  let message: string;
  if (search(DASH_LIST_ENDING, text) !== undefined) {
    rule = "dash_list_ending";
    message =
      "名詞を読点で並べて末尾を「──」などのダッシュで閉じる書き方が検出されました。余韻を装う装飾に見えやすいため、" +
      "何についての列挙かを述語で言い切ってください。文脈から述語が分からない場合は、推測で補わず書き手に確かめてください。";
  } else if (search(DASH_INSERTION, text) !== undefined) {
    rule = "dash_insertion";
    message =
      "補足や言い換えをダッシュで挟む書き方が検出されました。読点や助詞、括弧でつなぐか、文を分けてください。" +
      "ただし、小説や随筆で書き手が文体として使っている場合や、引用は残してかまいません。";
  } else {
    rule = "dash_decoration";
    message =
      "ダッシュ記号（—、―、──など）が検出されました。補足や余韻のための装飾であれば、読点や助詞、括弧でつなぐか、" +
      "文を分けてください。ただし、小説や随筆で書き手が文体として使っている場合や、引用は残してかまいません。";
  }
  return { rule, line: lineNo, severity: "warn", message, snippet };
};

// ---- 比喩動詞 ----
const MOMENT_ABSTRACT =
  String.raw`(?:品質|価値|信頼|指標|意味|目的|本質|理解|学び|成長|可能性|魅力|違い|良さ|大切さ|重要性` +
  String.raw`|情熱|やる気|モチベーション|創造性|(?<!お)それ)(?:は|が|も)`;
const MOMENT_PATTERN =
  String.raw`(?:手|目|口|耳)にした瞬間` +
  String.raw`|(?:目的|目標|ゴール|指標|手段)にした瞬間|(?:優先|目指|追求|追い求め)した瞬間` +
  String.raw`|(?:^|(?<=[。．！？!?]))(?:(?!のは)[^。．！？!?])*?した瞬間(?:だった|でした)(?=` +
  END_DECORATION_RUN +
  String.raw`(?:[。．！？!?」』）)]|$))` +
  String.raw`|した瞬間(?:に|から)?(?:は|も)?[、，,]?` +
  String.raw`(?:(?:わか|分か)(?:る|り|った|ら)|悟|実感|確信|理解(?:する|した|でき)|崩れ|崩壊)` +
  String.raw`|した瞬間(?:に|から)?(?:は|も)?[、，,]?[^、，,。！？!?]{0,40}?` +
  String.raw`(?:` +
  MOMENT_ABSTRACT +
  String.raw`|全滅|台無し|無意味|色あせ|色褪せ|虜|魅了|心を奪` +
  String.raw`|(?:世界|景色|人生|価値観|見え方)が(?:一変|変わ)` +
  String.raw`|(?:すべて|全て|何もかも)が?(?:変わ|動き出|始ま|一変|つなが|繋が|報われ|輝))`;

const KIKU_END = "。．！？!?";
const KIKU_PATTERN = String.raw`効[かきくけいた]`;
const KIKU_LITERAL_NEAR =
  String.raw`薬|剤|(?<=[0-9０-９数一二三四五六])錠|抗生物質|ワクチン|注射|点滴|麻酔|湿布|漢方|治療|鍼|ツボ|マッサージ|サプリメント|サプリ` +
  String.raw`|服用|服薬|内服|接種|症状|頭痛|腰痛|肩こり|肩凝り|花粉症|風邪|二日酔い|鼻炎|乾燥肌|肌荒れ|便秘|むくみ|筋肉痛|痛み` +
  String.raw`|日焼け止め|保湿|肥料|カフェイン|コーヒー|アルコール|酒|(?<!気の)毒` +
  String.raw`|冷房|暖房|エアコン|クーラー|ヒーター|空調|除湿|床暖房|床暖|ストーブ|冷蔵|冷凍|扇風機|冷え|入浴|湯船|風呂|温泉` +
  String.raw`|ブレーキ|制動|サスペンション|グリップ` +
  String.raw`|わさび|ワサビ|山葵|塩加減|塩気|塩味|塩分|塩|胡椒|こしょう|コショウ|スパイス|辛子|カラシ|出汁|香辛料|調味料|酢` +
  String.raw`|生姜|ショウガ|山椒|唐辛子|七味|柚子|ハーブ|ミント|にんにく|ニンニク|レモン|炭酸` +
  String.raw`|隠し味|酸味|辛味|辛み|辛さ|甘さ|甘み|甘味|酸っぱさ|苦味|苦み|旨味|うま味|風味|香り(?!づけ|付け)|味付け|味つけ` +
  String.raw`|(?<![一-龥々])味`;
const KIKU_LITERAL_SOFTWARE =
  String.raw`(?<![A-Za-z])(?:ABS|JIT)|キャッシュ|インデックス|圧縮|最適化|プリフェッチ|チューニング` + String.raw`|設定の変更|設定変更`;
const KIKU_LITERAL = `${KIKU_LITERAL_NEAR}|${KIKU_LITERAL_SOFTWARE}`;
const KIKU_CONTEXT =
  String.raw`飲んで|飲んだ|飲む|飲め|飲み(?:始め|はじめ|続け)|飲ませ|飲み物|飲み方|食後|食前|就寝前|用法|用量` +
  String.raw`|効き目は個人差|個人差`;
const KIKU_ABSTRACT =
  String.raw`(?:見直し|工夫|改善|施策|対策|習慣|仕組み|しくみ|積み重ね|経験|努力|ルール|変更` +
  String.raw`|取り組み|取組み|修正|調整|改修|方針|戦略|準備|練習|勉強|投資|配慮)`;
const KIKU_STOP = `、，,${KIKU_END}`;
const KIKU_RE = {
  literalSubject: pattern(
    String.raw`(?:` + KIKU_LITERAL + String.raw`)(?:(?:が|は|も|こそ|の|に|って|として)[、，,]?|[、，,])` + `[^${KIKU_STOP}を]{0,10}$`,
  ),
  idiom: pattern(
    String.raw`(?:融通|小回り|応用|機転|睨み|にらみ|潰し|つぶし|保存|無理|ごまかし|誤魔化し|押し|抑え|見通し|見晴らし` +
      String.raw`|保険|割引|学割|(?<![一-龥々])(?:気|目|鼻|口|顔|腕|足))[がのはもを](?:よく|地味に|じわじわ)?$`,
  ),
  v210: pattern(String.raw`(?:地味に|よく|じわじわ)$`),
  negation: pattern(
    String.raw`か|きませ|けな|けませ|いて(?:い)?な|いていませ|いてませ|いてこ|いてきませ|いてくれ(?:な|ませ)` +
      String.raw`|き(?:始め|はじめ)(?:な|ませ)|き出さ`,
  ),
  abstractSubject: pattern(
    KIKU_ABSTRACT + String.raw`(?:し?(?:た|ておいた|ていた)(?:の|こと))?(?:が|は|も|こそ|から)[、，,]?` + `[^${KIKU_STOP}]{0,12}$`,
  ),
  verb: pattern(String.raw`く|き(?!目)|け|い[てた]`),
  effectOwner: pattern(`${KIKU_ABSTRACT}の$`),
  effect: pattern(String.raw`き目(?:が|は|も)(?:出|表れ|現れ|あらわれ)`),
  gradual: pattern(String.raw`いて(?:く[るれ]|き[たてまそ])|き(?:始め|はじめ|出[しすせ])`),
  adverb: pattern(
    String.raw`(?:後から|あとから|後々|あとあと|徐々に|次第に|じわりと|じんわりと?|じわじわと|ジワジワと?|じわっと` +
      String.raw`|後で|あとで|後になって|あとになって)$`,
  ),
  contextNear: pattern(`(?:${KIKU_LITERAL_NEAR}|${KIKU_CONTEXT})(?![一-龥々ァ-ヴーA-Za-z])`),
  timing: pattern(
    String.raw`(?:[0-9０-９]+|数|半)\s*(?:分|時間)(?:間)?` + String.raw`(?=ほど|くらい|ぐらい|程度|後|以内|経|たつ|たっ|で|もすると|もしないうち)`,
  ),
  sentence: pattern(`[^${KIKU_END}]+[${KIKU_END}]*|[${KIKU_END}]+`),
};
const KIKU_CANDIDATE = pattern(KIKU_PATTERN);
const KIKU_WINDOW_LINES = 3;

const kikuMetaphorInLine = (text: string, beforeLines: readonly string[]): boolean => {
  const earlier: string[] = [];
  let window: boolean | undefined;
  for (const sentenceMatch of finditer(KIKU_RE.sentence, text)) {
    const sentence = sentenceMatch.group()!;
    let loose: boolean | undefined;
    for (const found of finditer(KIKU_CANDIDATE, sentence)) {
      const start = found.start;
      const prefix = sentence.slice(Math.max(0, start - 48), start);
      const suffix = sentence.slice(start + 1, start + 13);
      if (search(KIKU_RE.idiom, prefix) !== undefined || search(KIKU_RE.literalSubject, prefix) !== undefined) continue;
      if (search(KIKU_RE.v210, prefix) !== undefined) return true;
      if (match(KIKU_RE.negation, suffix) !== undefined) continue;
      if (match(KIKU_RE.verb, suffix) !== undefined && search(KIKU_RE.abstractSubject, prefix) !== undefined) return true;
      if (match(KIKU_RE.effect, suffix) !== undefined && search(KIKU_RE.effectOwner, prefix) !== undefined) return true;
      if (
        !(
          match(KIKU_RE.gradual, suffix) !== undefined ||
          (match(KIKU_RE.verb, suffix) !== undefined && search(KIKU_RE.adverb, prefix) !== undefined)
        )
      ) {
        continue;
      }
      loose ??= search(KIKU_RE.contextNear, sentence) !== undefined || search(KIKU_RE.timing, sentence) !== undefined;
      if (loose) continue;
      if (window === undefined) {
        const nearby = [...beforeLines.slice(-KIKU_WINDOW_LINES), ...earlier];
        window = search(KIKU_RE.contextNear, nearby.join("\n")) !== undefined;
      }
      if (window) continue;
      return true;
    }
    earlier.push(sentence);
  }
  return false;
};

const KOWARERU = "比喩動詞「壊れる」";
const SILENTLY_FAIL = "英語直訳「静かに壊れる (silently fail)」";
const SHUREN = String.raw`(議論|意見|結論|方向性|価格|話題|検討)が[^。！？!?]*?収斂`;
const METAPHOR_VERB_PATTERNS: readonly (readonly [string, string])[] = [
  [KIKU_PATTERN, "比喩動詞「効く」の過剰使用"],
  [String.raw`(データ|仕様|設計|環境|ビルド|システム|秩序)が(静かに)?壊れ`, KOWARERU],
  [String.raw`静かに(壊れ|落ち|失敗|沈黙)`, SILENTLY_FAIL],
  [String.raw`黙って(無視|捨て|スキップ|破棄)`, "英語直訳「黙って無視される」"],
  [String.raw`側に倒[すしせ]`, "判断を方向で表現する「〜側に倒す」"],
  [String.raw`時間[をに]溶か[さしすせそ]`, "比喩動詞「時間を溶かす」"],
  [String.raw`(1つずつ|一つずつ)潰[していく]`, "比喩動詞「潰す」"],
  [String.raw`(実装|詳細|コード|設計|内部|仕組み|領域|本質)(に|まで|へ)踏み込[んむみま]`, "比喩動詞「踏み込む」"],
  [String.raw`動かしながら引き返[すし]`, "比喩動詞「引き返す」"],
  [String.raw`代わりに添え[るた]`, "比喩動詞「添える」"],
  [SHUREN, "比喩動詞「収斂する」"],
  [MOMENT_PATTERN, "英語直訳「〜した瞬間 (the moment ...)」"],
  [String.raw`(前提|基盤)が崩れ[るた]`, "抽象比喩「前提が崩れる」"],
  [String.raw`文化が醸成`, "非生物主語「文化が醸成される」"],
  [String.raw`プロセスが定着`, "非生物主語「プロセスが定着する」"],
  [String.raw`事例が残した`, "非生物主語「事例が残した」"],
];

// ---- 前置きと結び ----
const OVERSTATEMENT_PATTERN =
  String.raw`とも?(?:言|い)(?:い切|いき)?っても(?:過言|言い過ぎ|言いすぎ|いいすぎ)` +
  String.raw`(?:では(?:ありません|ない)|じゃ(?:ありません|ない))(?:です)?` +
  String.raw`(?:でしょう|だろう|かもしれ(?:ません|ない)|と(?:思|おも)(?:います|う)|ね|よ)?` +
  String.raw`(?:[（(][^）)]*[）)])?[。！？!?]?$`;
const OVERSTATEMENT_DESC = "文末の付け足し「〜と言っても過言ではありません」";
const FILLER_PATTERNS: readonly (readonly [string, string])[] = [
  [String.raw`^(まず|ここで)?(重要|大切|大事)なのは、?`, "前置フィラー「重要なのは」"],
  [String.raw`^結論から(言|い)(う|い|え)|^結論から申し上げ`, "前置フィラー「結論から言うと」"],
  [String.raw`^正直に言うと、?`, "前置フィラー「正直に言うと」"],
  [String.raw`^本音を言うと、?`, "前置フィラー「本音を言うと」"],
  [String.raw`^避けたいのは、?`, "前置フィラー「避けたいのは」"],
  [String.raw`^ポイントは、`, "前置フィラー「ポイントは、」"],
  [String.raw`見落とされがち|面白いのはここ|まさにそこがポイント`, "自己ラベル「見落とされがち」など"],
  [String.raw`いかがでした(でしょうか|か)?[？?。]?$`, "定型クロージング「いかがでしたでしょうか」"],
  [String.raw`ぜひ(?:参考にして|試して|活用して)(?:みて)?ください[！!。]?`, "定型クロージング「ぜひ〜してみてください」"],
  [
    String.raw`参考に(なれ|な)ば幸い|お役に立て(れ)?ば幸い|ぜひご(活用|参考に)ください|まずは小さく(始め|はじめ)(?:ましょう|てみましょう|てください|てみてください|てみませんか|て(?:みて)?はいかが(?:ですか|でしょうか)|る(?:ことが(?:大切|大事|重要)|のがおすすめ)です)[。！？!?]?$`,
    "定型クロージング「参考になれば幸いです」など",
  ],
  [String.raw`に(?:他|ほか)なりません`, "過剰な自己ラベリング「〜に他なりません」"],
  [String.raw`^ご質問ありがとうございます`, "チャット応答の名残「ご質問ありがとうございます」"],
  [String.raw`見ていきましょう[。！!]?$|深掘りしていきます`, "定型導入「それでは見ていきましょう」など"],
  [
    String.raw`^(必要なら|ご希望があれば|よろしければ)、?(次に|続けて|この後(?!の))[^。！？!?]*(?:ます|ましょう)(?:か|よ|ね|よね)?(?:（[^。！？!?（）]*）)?[。！？!?]?$`,
    "チャット応答の名残「必要なら次に〜します」",
  ],
  [OVERSTATEMENT_PATTERN, OVERSTATEMENT_DESC],
];
const FILLER_NOTES: Record<string, string> = {
  [OVERSTATEMENT_DESC]:
    "事実を淡々と書いてください。数値などの裏付けがあって誇張でない事実を強調する場合や、引用・会話・表現そのものへの言及は残してかまいません。",
  "チャット応答の名残「ご質問ありがとうございます」": "チャットやメールの返信そのものなら残してかまいません。",
  "チャット応答の名残「必要なら次に〜します」": "書き手が読み手に実際に申し出ている案内なら残してかまいません。",
  "定型クロージング「参考になれば幸いです」など": "メールや手紙の結びの挨拶や、書き手が実際に勧めている内容なら残してかまいません。",
  "定型クロージング「いかがでしたでしょうか」": "メールや手紙の結びの挨拶なら残してかまいません。",
  "定型クロージング「ぜひ〜してみてください」": "書き手が実際に勧めている内容なら残してかまいません。",
};

// ---- 文の切り出しと文末の重複 ----
const SENTENCE_MARKS = "。！？";
const LINE_SENTENCE_MARKS = "。！？!?";
const LIST_MARKER_LINE = pattern(String.raw`^\s*([-*+]|\d+\.)\s+`);
const LIST_LINK_LINE = pattern(String.raw`[-*+]\s+\[.*?\]\(https?://`);

// (?<=[marks]) で分けた区切りの位置（各記号の直後）
const cutsAfter = (text: string, marks: string): number[] => {
  const ends: number[] = [];
  for (let index = 0; index < text.length; index += 1) if (marks.includes(text[index]!)) ends.push(index + 1);
  return ends;
};

const splitAfter = (text: string, marks: string): string[] => {
  const pieces: string[] = [];
  let start = 0;
  for (const end of cutsAfter(text, marks)) {
    pieces.push(text.slice(start, end));
    start = end;
  }
  pieces.push(text.slice(start));
  return pieces;
};

type SentenceRecord = readonly [line: number, visible: string, source: string, group: string];

const plainSentenceRecords = (analysis: Analysis): SentenceRecord[] => {
  const records: SentenceRecord[] = [];
  analysis.blocks.forEach((block, blockId) => {
    if (block.kind !== "paragraph") return;
    let section = 0;
    for (const row of block.lines) {
      const visible = proseVisibleText(analysis, row.line);
      if (skipsAsImage(analysis, row, visible)) {
        section += 1;
        continue;
      }
      if (!pyStrip(visible)) continue;
      let start = 0;
      const ends = cutsAfter(visible, SENTENCE_MARKS);
      if (!ends.length || ends.at(-1) !== visible.length) ends.push(visible.length);
      for (const end of ends) {
        const clean = pyStrip(visible.slice(start, end));
        if (clean && cpLen(clean) > 3) records.push([row.line, clean, pyStrip(row.raw.slice(start, end)), `${blockId}:${section}`]);
        start = end;
      }
    }
  });
  return records;
};

const stripTrailing = (text: string, trailing: (ch: string | undefined) => boolean): string => {
  let end = text.length;
  while (end > 0 && trailing(text[end - 1])) end -= 1;
  return text.slice(0, end);
};
const END_TYPES = ["です", "ます", "でした", "ました", "である", "だ", "だろう", "でしょう", "ですね"];

const sentenceEndType = (s: string): string => {
  let end = s.length;
  const floor = Math.max(0, end - 64);
  const trailing = (ch: string | undefined): boolean => ch !== undefined && (SENTENCE_MARKS.includes(ch) || isSpace(ch));
  while (end > floor && trailing(s[end - 1])) end -= 1;
  let clean = end === floor && end && trailing(s[end - 1]) ? stripTrailing(s, trailing) : s.slice(0, end);
  const core = stripEndDecoration(clean);
  if (core !== clean) {
    let stop = core.length;
    while (stop && trailing(core[stop - 1])) stop -= 1;
    clean = core.slice(0, stop);
  }
  return END_TYPES.find((type) => clean.endsWith(type)) ?? "その他";
};

type Sentence = readonly [line: number, text: string];

const splitDecorationBreaks = (
  sentences: readonly Sentence[],
  sources: readonly Sentence[],
  groups: readonly string[],
): readonly [Sentence[], Sentence[], string[]] => {
  if (!sentences.some(([, sentence]) => search(END_DECORATION_CHAR, sentence) !== undefined)) {
    return [[...sentences], [...sources], [...groups]];
  }
  const splitSentences: Sentence[] = [];
  const splitSources: Sentence[] = [];
  const splitGroups: string[] = [];
  sentences.forEach(([lineNo, sentence], index) => {
    const source = sources[index]![1];
    const group = groups[index]!;
    const pieces = decorationBreaks(sentence);
    const cuts: number[] = [];
    if (pieces) {
      const textEnd = rstrip(sentence).length;
      let position = 0;
      let start = 0;
      for (const piece of pieces.slice(0, -1)) {
        position += piece.length;
        if (cpLen(pyStrip(sentence.slice(Math.max(start, position - 8), position))) > 3 && cpLen(sentence.slice(position, textEnd)) > 3) {
          cuts.push(position);
          start = position;
        }
      }
    }
    if (!cuts.length) {
      splitSentences.push([lineNo, sentence]);
      splitSources.push([lineNo, source]);
      splitGroups.push(group);
      return;
    }
    const sameWidth = source.length === sentence.length;
    const starts = [0, ...cuts];
    const ends = [...cuts, sentence.length];
    starts.forEach((start, cut) => {
      const end = ends[cut]!;
      splitSentences.push([lineNo, pyStrip(sentence.slice(start, end))]);
      splitSources.push([lineNo, sameWidth ? pyStrip(source.slice(start, end)) : source]);
      splitGroups.push(group);
    });
  });
  return [splitSentences, splitSources, splitGroups];
};

const sentenceEndFindings = (
  sentences: readonly Sentence[],
  sources: readonly Sentence[],
  groups: readonly string[],
): Finding[] => {
  const findings: Finding[] = [];
  const endTypes = sentences.map(([lineNo, s]) => [lineNo, s, sentenceEndType(s)] as const);
  let count = 1;
  for (let index = 1; index < endTypes.length; index += 1) {
    const [, , previousType] = endTypes[index - 1]!;
    const [currentLine, , currentType] = endTypes[index]!;
    const sameParagraph = groups[index] === groups[index - 1];
    if (sameParagraph && currentType !== "その他" && currentType === previousType) {
      count += 1;
      if (count === 3) {
        findings.push({
          rule: "sentence_end_repetition",
          line: currentLine,
          severity: "warn",
          message: `同一文末「${currentType}」が3回以上連続しています。読みにくくなっていないか確認し、自然な説明や文体は保ってください。`,
          snippet: sources[index]![1],
        });
      }
    } else count = 1;
  }
  return findings;
};

// ---- 太字の量と箇条書きの比率 ----
const DETAILS_HINT = pattern("<details", "i");
const DETAILS_TOKEN = pattern(String.raw`<!--|<(/?)(details|script|style|textarea)(?=[\s/>]|$)`, "i");

const detailsInnerLines = (analysis: Analysis): Set<number> | undefined => {
  if (search(DETAILS_HINT, analysis.text) === undefined) return undefined;
  const opened: number[] = [];
  const pairs: (readonly [number, number])[] = [];
  let inComment = false;
  let rawClose: Pattern | undefined;
  for (const row of analysis.lines) {
    if (row.kind !== "html_block" || row.quote_depth) {
      inComment = false;
      rawClose = undefined;
      continue;
    }
    const text = row.raw;
    let position = 0;
    while (position < text.length) {
      if (inComment) {
        const end = text.indexOf("-->", position);
        if (end < 0) break;
        inComment = false;
        position = end + 3;
        continue;
      }
      if (rawClose !== undefined) {
        const found = search(rawClose, text, position);
        if (found === undefined) break;
        rawClose = undefined;
        position = found.end;
        continue;
      }
      const token = search(DETAILS_TOKEN, text, position);
      if (token === undefined) break;
      position = token.end;
      if (token.group() === "<!--") inComment = true;
      else if (token.group(2)!.toLowerCase() !== "details") {
        if (!token.group(1)) rawClose = pattern(String.raw`</` + token.group(2)! + String.raw`(?=[\s>]|$)`, "i");
      } else if (!token.group(1)) opened.push(row.line);
      else if (opened.length) pairs.push([opened.pop()!, row.line]);
    }
  }
  if (!pairs.length) return undefined;
  const inside = new Set<number>();
  for (const [first, last] of pairs) for (let line = first + 1; line < last; line += 1) inside.add(line);
  return inside;
};

type Metrics = {
  char_count: number;
  total_lines: number;
  list_lines: number;
  list_ratio: number;
  bold_count: number;
  bold_per_1000: number;
  details_list_lines?: number;
};

const roundTo = (value: number, digits: number): number => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

const BOLD_SPAN = pattern(String.raw`\*\*[^*]+\*\*`);

const metricsAndListGate = (analysis: Analysis): readonly [Metrics, number] => {
  const plainRows: (readonly [Row, string])[] = [];
  for (const row of analysis.lines) {
    const stripped = pyStrip(row.raw);
    if (PROTECTED_ROWS.has(row.kind)) continue;
    if (row.quote_depth || row.kind === "table") continue;
    const visible = lineVisibleText(analysis, row.line, METRIC_OPAQUE_KINDS);
    if (skipsAsImage(analysis, row, visible)) continue;
    if (stripped) plainRows.push([row, visible]);
  }
  const totalLines = plainRows.length;
  const detailsInside = detailsInnerLines(analysis);
  let listLines = 0;
  let detailsListLines = 0;
  let detailsListChars = 0;
  for (const [row, visible] of plainRows) {
    if (match(LIST_MARKER_LINE, row.raw) !== undefined && search(LIST_LINK_LINE, row.raw) === undefined) {
      if (detailsInside?.has(row.line)) {
        detailsListLines += 1;
        detailsListChars += cpLen(removeSpaces(visible));
      } else listLines += 1;
    }
  }
  const plainContent = plainRows.map(([, visible]) => visible).join("\n");
  const boldCount = finditer(BOLD_SPAN, plainContent).length;
  const charCount = cpLen(removeSpaces(plainContent));
  const boldPer1000 = charCount > 0 ? (boldCount / charCount) * 1000 : 0;
  const ratioBase = totalLines - detailsListLines;
  const listRatio = ratioBase > 0 ? listLines / ratioBase : 0;
  const metrics: Metrics = {
    char_count: charCount,
    total_lines: totalLines,
    list_lines: listLines,
    list_ratio: roundTo(listRatio, 3),
    bold_count: boldCount,
    bold_per_1000: roundTo(boldPer1000, 2),
  };
  if (detailsInside !== undefined) metrics.details_list_lines = detailsListLines;
  return [metrics, charCount - detailsListChars];
};

// ---- 太字が表示されるか ----
const BOLD_ASCII_PUNCT = new Set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~".split(""));
type Punct = (ch: string) => boolean;
const boldPunctGfm: Punct = (ch) => ch !== "" && (BOLD_ASCII_PUNCT.has(ch) || /^\p{P}$/u.test(ch));
const boldPunctNew: Punct = (ch) => ch !== "" && /^[\p{P}\p{S}]$/u.test(ch);

const neighbours = (text: string, start: number, end: number): readonly [string, string] => [
  start ? charBefore(text, start) : "",
  end < text.length ? charAt(text, end) : "",
];

const roles = (text: string, start: number, end: number, punct: Punct): readonly [boolean, boolean] => {
  const [prev, next] = neighbours(text, start, end);
  const canOpen = !unicodeWhitespace(next) && (!punct(next) || unicodeWhitespace(prev) || punct(prev));
  const canClose = !unicodeWhitespace(prev) && (!punct(prev) || unicodeWhitespace(next) || punct(next));
  return [canOpen, canClose];
};

const runsFromMasks = (text: string, masked: readonly Range[]): Range[] => {
  const runs: Range[] = [];
  let maskIndex = 0;
  for (const found of finditer(String.raw`\*+`, text)) {
    let position = found.start;
    const finish = found.end;
    while (position < finish) {
      while (maskIndex < masked.length && masked[maskIndex]![1] <= position) maskIndex += 1;
      if (maskIndex < masked.length && masked[maskIndex]![0] <= position) {
        position = Math.min(finish, masked[maskIndex]![1]);
        continue;
      }
      let end = finish;
      if (maskIndex < masked.length) end = Math.min(end, masked[maskIndex]![0]);
      if (end > position) runs.push([position, end]);
      position = end;
    }
  }
  return runs;
};

type Delimiter = {
  start: number;
  head: number;
  remaining: number;
  length: number;
  canOpen: boolean;
  canClose: boolean;
  stackIndex: number;
};

const delimiterParse = (text: string, punct: Punct, runs: readonly Range[]): readonly [Range[], Set<number>] => {
  const openers: Delimiter[] = [];
  const buckets = new Map<string, Delimiter[]>();
  for (const mod of [0, 1, 2]) for (const closes of [false, true]) buckets.set(`${mod}:${closes}`, []);
  const bucketOf = (delimiter: Delimiter) => buckets.get(`${delimiter.length % 3}:${delimiter.canClose}`)!;
  const gfmBounds = punct === boldPunctGfm;
  const bottoms = new Map<string, number>();
  const pairs: Range[] = [];
  const consumed = new Set<number>();
  for (const [start, end] of runs) {
    const [canOpen, canClose] = roles(text, start, end, punct);
    const closer: Delimiter = { start, head: 0, remaining: end - start, length: end - start, canOpen, canClose, stackIndex: -1 };
    while (canClose && closer.remaining) {
      let opener: Delimiter | undefined;
      const closerMod = closer.length % 3;
      const bottomKey = `${closerMod}:${gfmBounds ? "none" : String(canOpen)}`;
      const bottom = bottoms.get(bottomKey) ?? -1;
      for (const [key, bucket] of buckets) {
        const [modText, closesText] = key.split(":");
        const mod = Number(modText);
        const closes = closesText === "true";
        const blocked = (canOpen || closes) && (mod + closerMod) % 3 === 0 && (mod !== 0 || closerMod !== 0);
        const top = bucket.at(-1);
        if (top !== undefined && !blocked && top.start >= bottom) {
          if (opener === undefined || top.stackIndex > opener.stackIndex) opener = top;
        }
      }
      if (opener === undefined) {
        bottoms.set(bottomKey, start);
        break;
      }
      const used = opener.remaining >= 2 && closer.remaining >= 2 ? 2 : 1;
      const left = opener.start + opener.head + opener.remaining - used;
      const right = closer.start + closer.head;
      if (used === 2) pairs.push([left, right]);
      for (let offset = 0; offset < used; offset += 1) {
        consumed.add(left + offset);
        consumed.add(right + offset);
      }
      while (openers.at(-1) !== opener) bucketOf(openers.pop()!).pop();
      bucketOf(opener).pop();
      opener.remaining -= used;
      closer.head += used;
      closer.remaining -= used;
      if (!opener.remaining) openers.pop();
      else bucketOf(opener).push(opener);
    }
    if (canOpen && closer.remaining) {
      closer.stackIndex = openers.length;
      openers.push(closer);
      bucketOf(closer).push(closer);
    }
  }
  return [pairs, consumed];
};

const directEscape = (text: string, position: number): boolean => {
  let start = position;
  while (start > 0 && text[start - 1] === "\\") start -= 1;
  return (position - start) % 2 === 1;
};

const starExtent = (text: string, position: number): Range => {
  let left = position;
  while (left > 0 && text[left - 1] === "*" && !directEscape(text, left - 1)) left -= 1;
  let right = position;
  while (right < text.length && text[right] === "*") right += 1;
  return [left, right];
};

const localPairOk = (text: string, i: number, j: number): boolean => {
  const [leftStart, leftEnd] = starExtent(text, i);
  const [rightStart, rightEnd] = starExtent(text, j);
  for (const punct of [boldPunctGfm, boldPunctNew]) {
    const [leftOpen, leftClose] = roles(text, leftStart, leftEnd, punct);
    const [rightOpen, rightClose] = roles(text, rightStart, rightEnd, punct);
    if (!leftOpen || !rightClose) return false;
    const leftN = leftEnd - leftStart;
    const rightN = rightEnd - rightStart;
    if ((rightOpen || leftClose) && (leftN + rightN) % 3 === 0 && (leftN % 3 !== 0 || rightN % 3 !== 0)) return false;
  }
  return true;
};

const pairKey = ([left, right]: Range): string => `${left}:${right}`;

const boldScan = (text: string, runs: readonly Range[]): readonly [Range[], Set<string>, Set<string>] => {
  const [gfm, usedGfm] = delimiterParse(text, boldPunctGfm, runs);
  const [common, usedCommon] = delimiterParse(text, boldPunctNew, runs);
  const pairs = new Map<string, Range>();
  for (const pair of [...gfm, ...common]) pairs.set(pairKey(pair), pair);
  const used = new Set([...usedGfm, ...usedCommon]);
  const usedIn = (start: number, end: number) => {
    for (let position = start; position < end; position += 1) if (used.has(position)) return true;
    return false;
  };
  const nextDouble: (number | undefined)[] = [];
  let later: number | undefined;
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    nextDouble[index] = later;
    if (runs[index]![1] - runs[index]![0] >= 2) later = index;
  }
  runs.forEach(([start, end], index) => {
    if (end - start < 2 || usedIn(start, end)) return;
    const next = nextDouble[index];
    if (next === undefined) return;
    const [laterStart, laterEnd] = runs[next]!;
    if (end < laterStart && unicodeWhitespace(charAt(text, end)) && usedIn(laterStart, laterEnd)) return;
    if (!localPairOk(text, start, laterStart)) pairs.set(pairKey([start, laterStart]), [start, laterStart]);
  });
  const sorted = [...pairs.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return [sorted, new Set(gfm.map(pairKey)), new Set(common.map(pairKey))];
};

const boldShort = (s: string): string => (cpLen(s) <= 30 ? s : `${[...s].slice(0, 12).join("")}…${[...s].slice(-12).join("")}`);

const boldProblems = (text: string, analysis: Analysis): { line: number; found: string }[] => {
  if (!text.includes("**")) return [];
  const out: { line: number; found: string }[] = [];
  const masks = analysis.mask_spans;
  let maskIndex = 0;
  for (const block of analysis.blocks) {
    if (PROTECTED_ROWS.has(block.kind)) continue;
    const rows = block.lines;
    const begin = rows[0]!.start;
    const finish = rows.at(-1)!.start + rows.at(-1)!.raw.length;
    const blockText = text.slice(begin, finish);
    if (!blockText.includes("**")) continue;
    const offsets = rows.map((row) => row.start - begin);
    while (maskIndex < masks.length && masks[maskIndex]![1] <= begin) maskIndex += 1;
    const blockMasks: Range[] = [];
    for (let index = maskIndex; index < masks.length; index += 1) {
      const [left, right] = masks[index]!;
      if (left >= finish) break;
      blockMasks.push([Math.max(left, begin) - begin, Math.min(right, finish) - begin]);
    }
    const runs = runsFromMasks(blockText, blockMasks);
    const [pairs, gfmPairs, commonPairs] = boldScan(blockText, runs);
    for (const [i, j] of pairs) {
      const key = pairKey([i, j]);
      if (gfmPairs.has(key) && commonPairs.has(key)) continue;
      const pre = blockText.slice(Math.max(0, i - 4), i);
      const post = blockText.slice(j + 2, j + 6);
      const lineIndex = bisectRight(offsets, i) - 1;
      out.push({ line: rows[lineIndex]!.line, found: pre + boldShort(blockText.slice(i, j + 2)) + post });
    }
  }
  return out;
};

// ---- 文脈（誇張の付け足しを、引用を伏せた文で見る） ----
const rule9Context = (analysis: Analysis): Map<number, (readonly [string, string])[]> => {
  const rows = analysis.lines;
  const parts = rows.map((row) =>
    (row.kind === "paragraph" || row.kind === "list") && !row.quote_depth
      ? proseVisibleText(analysis, row.line).replaceAll("__", "").replaceAll("*", "")
      : "",
  );
  const masked = maskQuotedSegments(parts.join("\n"));
  let offset = 0;
  const visibleLines = new Map<number, string>();
  rows.forEach((row, index) => {
    const part = parts[index]!;
    visibleLines.set(row.line, pyStrip(masked.slice(offset, offset + part.length)));
    offset += part.length + 1;
  });
  const contexts = new Map<number, (readonly [string, string])[]>();
  for (const block of analysis.blocks) {
    if (block.kind !== "paragraph" && block.kind !== "list") continue;
    const records: (readonly [number, string])[] = [];
    for (const row of block.lines) {
      contexts.set(row.line, []);
      for (const sentence of splitAfter(visibleLines.get(row.line)!, LINE_SENTENCE_MARKS)) {
        if (pyStrip(sentence)) records.push([row.line, pyStrip(sentence)]);
      }
    }
    records.forEach(([line, sentence], index) => {
      const following = records[index + 1]?.[1] ?? "";
      contexts.get(line)!.push([sentence, following]);
    });
  }
  return contexts;
};

// ---- 本体 ----
const decodeSource = (text: string): string => (text.startsWith("\uFEFF") ? text.slice(1) : text).replace(/\r\n?/gu, "\n");

const METAPHOR_MESSAGE = (desc: string): string =>
  `${desc}が検出されました。不自然な比喩動詞であれば、ふだん使う動詞や客観的な表現に書き直してください。ただし、文字どおりの動作や状態変化を表している場合は無理に言い換える必要はありません。`;

const lintText = (source: string): Finding[] => {
  const text = decodeSource(source);
  let findings: Finding[] = [];
  const analysis = analyzeMarkdown(text);
  let rule9: Map<number, (readonly [string, string])[]> | undefined;
  const [metrics, listGateChars] = metricsAndListGate(analysis);
  const records = plainSentenceRecords(analysis);
  const metaphorPatterns = METAPHOR_VERB_PATTERNS.map(([source_, desc]) => [pattern(source_), desc, source_] as const);
  const fillerPatterns = FILLER_PATTERNS.map(([source_, desc]) => [pattern(source_), desc, source_] as const);
  const dashPossible = [...DASH_CHARS].some((ch) => text.includes(ch));
  let kikuLines: string[] = [];
  let kikuBefore: string[] = [];

  if (metrics.char_count > 300 && metrics.bold_per_1000 > 3.0) {
    findings.push({
      rule: "excess_bold",
      line: 1,
      severity: "warn",
      message: `太字の頻度（1,000字あたり ${metrics.bold_per_1000}個）が設定した目安を超えています（推奨: 2.0以下）。強調の役割を確かめ、不要なものだけ整理してください。`,
      snippet: `太字数: ${metrics.bold_count}回 / ${metrics.char_count}文字`,
    });
  }
  if (listGateChars > 300 && metrics.list_ratio > 0.25) {
    let snippet = `リスト行: ${metrics.list_lines} / 全非空行: ${metrics.total_lines - (metrics.details_list_lines ?? 0)}`;
    if (metrics.details_list_lines) snippet += `（<details> の中の箇条書き${metrics.details_list_lines}行は数えていません）`;
    findings.push({
      rule: "excess_list",
      line: 1,
      severity: "warn",
      message: `箇条書きの比率（${roundTo(metrics.list_ratio * 100, 1)}%）が設定した目安を超えています（推奨: 15%以下）。項目の役割を確かめ、不要なものだけ整理してください。`,
      snippet,
    });
  }

  findings.push(
    ...sentenceEndFindings(
      ...splitDecorationBreaks(
        records.map(([line, visible]) => [line, visible] as const),
        records.map(([line, , original]) => [line, original] as const),
        records.map(([, , , group]) => group),
      ),
    ),
  );

  for (const problem of boldProblems(text, analysis)) {
    findings.push({
      rule: "bold_not_rendered",
      line: problem.line,
      severity: "error",
      message:
        "太字の記号（**）について、太字として表示されない可能性のある書き方が見つかりました。GitHub などで太字にならず ** がそのまま表示されることがあります。直し方: かっこの内側だけを太字にするか、句読点を太字の外に出すか、文字に接する側に半角スペースを入れてください。",
      snippet: problem.found,
    });
  }

  const vocabularyFindings = (plainText: string, lineNo: number, snippet: string): void => {
    const slopHits = [
      ...SLOP_WORDS.filter((word) => plainText.includes(word)),
      ...SLOP_WORD_PATTERNS.filter(([, regex]) => search(regex, plainText) !== undefined).map(([word]) => word),
    ];
    for (const word of slopHits) {
      findings.push({
        rule: "slop_vocabulary",
        line: lineNo,
        severity: "warn",
        message: `AI頻出語彙「${word}」が含まれています。文脈上必要のない比喩や大げさな装飾であれば、ふだん使う自然な表現に置き換えてください。ただし、文字どおりの意味や必要な文脈を担っている場合は残してかまいません。`,
        snippet,
      });
    }
    let kowareruSpan: Range | undefined;
    for (const [regex, desc, source_] of metaphorPatterns) {
      if (source_ === SHUREN && !plainText.includes("収斂")) continue;
      if (desc === SILENTLY_FAIL && kowareruSpan) {
        for (const found of finditer(regex, plainText)) {
          if (kowareruSpan[0] <= found.start && found.end <= kowareruSpan[1]) continue;
          findings.push({ rule: "metaphor_verb", line: lineNo, severity: "warn", message: METAPHOR_MESSAGE(desc), snippet });
          break;
        }
        continue;
      }
      let found: Match | undefined = search(regex, plainText);
      if (found !== undefined && source_ === KIKU_PATTERN && !kikuMetaphorInLine(plainText, kikuBefore)) found = undefined;
      if (found !== undefined) {
        if (desc === KOWARERU) kowareruSpan = [found.start, found.end];
        findings.push({ rule: "metaphor_verb", line: lineNo, severity: "warn", message: METAPHOR_MESSAGE(desc), snippet });
      }
    }
  };

  for (const row of analysis.lines) {
    const lineNo = row.line;
    const line = row.raw;
    if (PROTECTED_ROWS.has(row.kind)) continue;
    const stripped = pyStrip(line);
    const scanText = pyStrip(proseVisibleText(analysis, lineNo));
    if (!scanText) continue;
    const plainText = scanText.replaceAll("__", "").replaceAll("*", "");
    kikuBefore = kikuLines.slice(-KIKU_WINDOW_LINES);
    kikuLines = [...kikuBefore, plainText];

    const emoji = emojiMatches(scanText);
    if (emoji.length) {
      findings.push({
        rule: "emoji_prohibited",
        line: lineNo,
        severity: "warn",
        message: `絵文字（${emoji.slice(0, 3).join(" ")}）が検出されました。AI特有の不要な装飾であれば整理してください。ただし、意味や必要な用途を担っている表現は保ってください。`,
        snippet: stripped,
      });
    }
    if (row.quote_depth || row.kind === "quote") continue;
    if (row.kind !== "table" && dashPossible) {
      const dash = dashFinding(plainText, lineNo, stripped);
      if (dash) findings.push(dash);
    }
    if (row.kind === "heading") {
      if (search(String.raw`とは[：:]`, scanText) !== undefined) {
        findings.push({
          rule: "heading_colon",
          line: lineNo,
          severity: "warn",
          message: "見出しが「Xとは：Y」の形になっています。コロンの後の語句を落とさずに、「Xの仕組みと使い方」のような名詞句にしてください。",
          snippet: stripped,
        });
      }
      if (search("（(素の出力|いわゆる|概要|詳細|感謝と設計への反映)）", scanText) !== undefined) {
        findings.push({
          rule: "redundant_bracket",
          line: lineNo,
          severity: "warn",
          message: "見出しに補足カッコが含まれています。役割を確認し、同じ情報の繰り返しや不要な補足であれば整理してください。",
          snippet: stripped,
        });
      }
      vocabularyFindings(plainText, lineNo, stripped);
      continue;
    }
    if (row.kind === "table") continue;
    const lineSentences = splitAfter(plainText, LINE_SENTENCE_MARKS)
      .map((part) => pyStrip(part))
      .filter(Boolean);

    if (search("[：:]$", stripped) !== undefined && !/^:{3,}$/u.test(stripped)) {
      const uriPrefixText = pyStrip(lineVisibleText(analysis, lineNo, ["inline_code"]));
      const last = rstrip(line).length - 1;
      if (
        !uriPrefixText.startsWith("http") &&
        !rangeOverlapsProtected(analysis, row.start + last, row.start + last + 1, METRIC_OPAQUE_KINDS)
      ) {
        findings.push({
          rule: "trailing_colon",
          line: lineNo,
          severity: "warn",
          message: "文末にコロン（：）があります。ラベルと値の対応などに必要か確認し、不要な前置きなら整理してください。",
          snippet: stripped,
        });
      }
    }

    vocabularyFindings(plainText, lineNo, stripped);

    const translated = new Set<string>();
    for (const [regex, desc] of TRANSLATED_TERM_PATTERNS) if (search(regex, plainText) !== undefined) translated.add(desc);
    for (const desc of translated) {
      findings.push({
        rule: "translated_term",
        line: lineNo,
        severity: "warn",
        message: `英語の直訳${desc}が検出されました。ソフトウェアの文脈であれば、開発現場で定着した言い方（「バージョン」「リグレッション」「デグレ」など）や具体的な説明を検討してください。ただし、出版物や製品の種類を表す「版」、回帰テストや回帰分析など定着した用語は残してかまいません。`,
        snippet: stripped,
      });
    }

    let lineCores: string[] | undefined;
    let contextCores: string[] | undefined;
    for (const [regex, desc, source_] of fillerPatterns) {
      let fillerSentences: readonly string[];
      if (source_ === OVERSTATEMENT_PATTERN) {
        rule9 ??= rule9Context(analysis);
        contextCores ??= withUndecorated(
          (rule9.get(lineNo) ?? []).map(([sentence]) => sentence),
          endClosersFor(analysis, lineNo),
        );
        fillerSentences = contextCores;
      } else if (source_.includes("$")) {
        lineCores ??= withUndecorated(lineSentences, endClosersFor(analysis, lineNo));
        fillerSentences = lineCores;
      } else fillerSentences = lineSentences;
      if (fillerSentences.some((sentence) => search(regex, sentence) !== undefined)) {
        findings.push({
          rule: "meta_filler",
          line: lineNo,
          severity: "warn",
          message: `${desc}が検出されました。単なる前置きや不要な飾りであれば削り、本題から書いてください。ただし、「何が大事か」という評価や主張そのものを担っている場合は、述語に移すなどして意味を残してください。${FILLER_NOTES[desc] ?? ""}`,
          snippet: stripped,
        });
      }
    }
  }

  let dashHits = 0;
  findings = findings.filter((finding) => {
    if (!DASH_RULES.has(finding.rule)) return true;
    dashHits += 1;
    return dashHits <= DASH_FINDING_LIMIT;
  });
  return findings;
};

export { lintText };
export type { Finding, Severity };
