// yomiyasu の scripts/markdown_visibility.py（2.5.0）を TypeScript に写したもの。
// 位置は JavaScript の文字列の位置（UTF-16）で数える。
import { escape, fullmatch, match, pattern, search, split } from "./py-re.ts";

const ASCII_PUNCT = new Set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~".split(""));
const HTML_BLOCK_TAGS = new Set(
  ("address article aside base basefont blockquote body caption center col colgroup " +
    "dd details dialog dir div dl dt fieldset figcaption figure footer form frame " +
    "frameset h1 h2 h3 h4 h5 h6 head header hr html iframe legend li link main " +
    "menu menuitem nav noframes ol optgroup option p param section source summary " +
    "table tbody td tfoot th thead title tr track ul").split(" "),
);
const TAG_NAME = pattern(String.raw`</?[A-Za-z][A-Za-z0-9-]*`);
const ATTRIBUTE_NAME = pattern(String.raw`[A-Za-z_:][A-Za-z0-9_.:-]*`);
const AUTOLINK = pattern(
  String.raw`<(?:[A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\x00-\x20]*|` +
    String.raw`[A-Za-z0-9.!#$%&'*+/=?^_` + "`" + String.raw`{|}~-]+@[A-Za-z0-9]` +
    String.raw`(?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?` +
    String.raw`(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*>)`,
);
const CONTAINER_MARKER = pattern(String.raw`(?:[-+*]|\d{1,9}[.)])(?:[ \t]+|$)`);
const BARE_URL = pattern(String.raw`(?:https?://|www\.)[^\s<>]+`);
const BLANK_TITLE_LINE = pattern(String.raw`(?:\r\n|\r|\n)[ \t]*(?:\r\n|\r|\n)`);
const SETEXT = pattern(String.raw`^ {0,3}(?:=+|-+)[ \t]*$`);
const THEMATIC = pattern(String.raw`^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$`);
const INLINE_EVENTS = pattern(String.raw`[\\` + "`" + String.raw`<\[\]hw]`);
const FENCE_OPEN = pattern(String.raw`^ {0,3}(` + "`{3,}" + String.raw`|~{3,})(.*)$`);
const ATX_HEADING = pattern(String.raw`^ {0,3}#{1,6}(?:[ \t]+|$)`);
const SPACE_SEPARATOR = /^\p{Zs}$/u;

type Span = readonly [number, number, string];
type Row = {
  line: number;
  raw: string;
  start: number;
  ending: string;
  content_start: number;
  content: string;
  quote_depth: number;
  list_item: boolean;
  kind: string;
};
type Block = { kind: string; lines: Row[] };
type Analysis = {
  text: string;
  lines: Row[];
  blocks: Block[];
  protected_spans: Span[];
  mask_spans: (readonly [number, number])[];
  mask_ends: number[];
  _line_visible_cache?: Map<string, string>;
  _kind_mask_cache?: Map<string, readonly [(readonly [number, number])[], number[]]>;
  [key: string]: unknown;
};

const unicodeWhitespace = (ch: string): boolean => {
  if (!ch) return true;
  const chars = [...ch];
  if (chars.length > 1) return chars.every((c) => unicodeWhitespace(c));
  return "\t\n\r\f".includes(ch) || SPACE_SEPARATOR.test(ch);
};

const escaped = (text: string, position: number): boolean => {
  let start = position;
  while (start > 0 && text[start - 1] === "\\") start -= 1;
  return (position - start) % 2 === 1;
};

const tagSpaceEnd = (text: string, start: number): number => {
  let pos = start;
  while (pos < text.length && " \t".includes(text[pos]!)) pos += 1;
  if (text.startsWith("\r\n", pos)) pos += 2;
  else if (pos < text.length && "\r\n".includes(text[pos]!)) pos += 1;
  while (pos < text.length && " \t".includes(text[pos]!)) pos += 1;
  return pos;
};

type Terminators = Record<string, number[]>;

const terminatorPositions = (text: string): Terminators => {
  const out: Terminators = {};
  for (const token of ["-->", "?>", "]]>", ">"]) {
    const positions: number[] = [];
    for (let at = text.indexOf(token); at >= 0; at = text.indexOf(token, at + 1)) positions.push(at);
    out[token] = positions;
  }
  return out;
};

const bisectLeft = (values: readonly number[], target: number): number => {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (values[middle]! < target) low = middle + 1;
    else high = middle;
  }
  return low;
};

const bisectRight = (values: readonly number[], target: number): number => {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (target < values[middle]!) high = middle;
    else low = middle + 1;
  }
  return low;
};

const tagEnd = (text: string, start: number, terminators?: Terminators): number | undefined => {
  const closed = (token: string, begin: number): number | undefined => {
    let end: number;
    if (terminators === undefined) end = text.indexOf(token, begin);
    else {
      const positions = terminators[token]!;
      const index = bisectLeft(positions, begin);
      end = index < positions.length ? positions[index]! : -1;
    }
    return end < 0 ? undefined : end + token.length;
  };
  if (text.startsWith("<!--", start)) {
    if (text.startsWith("<!-->", start)) return start + 5;
    if (text.startsWith("<!--->", start)) return start + 6;
    return closed("-->", start + 4);
  }
  if (text.startsWith("<?", start)) return closed("?>", start + 2);
  if (text.startsWith("<![CDATA[", start)) return closed("]]>", start + 9);
  if (text.startsWith("<!", start) && start + 2 < text.length && /[A-Za-z]/.test(text[start + 2]!)) {
    return closed(">", start + 3);
  }
  const opening = match(TAG_NAME, text, start);
  if (opening === undefined) return undefined;
  let pos = opening.end;
  const closing = text.startsWith("</", start);
  while (pos < text.length) {
    const spaceEnd = tagSpaceEnd(text, pos);
    if (spaceEnd < text.length && text[spaceEnd] === ">") return spaceEnd + 1;
    if (!closing && text.startsWith("/>", spaceEnd)) return spaceEnd + 2;
    if (closing || spaceEnd === pos) return undefined;
    const attribute = match(ATTRIBUTE_NAME, text, spaceEnd);
    if (attribute === undefined) return undefined;
    pos = attribute.end;
    const assignment = tagSpaceEnd(text, pos);
    if (assignment >= text.length || text[assignment] !== "=") continue;
    pos = tagSpaceEnd(text, assignment + 1);
    if (pos >= text.length) return undefined;
    if ("\"'".includes(text[pos]!)) {
      const end = text.indexOf(text[pos]!, pos + 1);
      if (end < 0) return undefined;
      pos = end + 1;
    } else {
      const begin = pos;
      while (pos < text.length && !" \t\r\n\"'=<>`".includes(text[pos]!)) pos += 1;
      if (pos === begin) return undefined;
    }
  }
  return undefined;
};

const linkEnd = (text: string, opening: number): number | undefined => {
  let pos = opening + 1;
  while (pos < text.length && " \t\n\r".includes(text[pos]!)) pos += 1;
  if (pos >= text.length) return undefined;
  if (text[pos] === "<") {
    pos += 1;
    let closedAngle = false;
    while (pos < text.length) {
      if (text[pos] === "\\" && pos + 1 < text.length) {
        pos += 2;
        continue;
      }
      if (text[pos] === ">") {
        pos += 1;
        closedAngle = true;
        break;
      }
      if ("<\n\r".includes(text[pos]!)) return undefined;
      pos += 1;
    }
    if (!closedAngle) return undefined;
  } else {
    let depth = 0;
    while (pos < text.length) {
      const ch = text[pos]!;
      if (ch === "\\" && pos + 1 < text.length) {
        pos += 2;
        continue;
      }
      if (ch === "(") {
        depth += 1;
        if (depth > 32) return undefined;
      } else if (ch === ")") {
        if (depth === 0) return pos + 1;
        depth -= 1;
      } else if (" \t\n\r".includes(ch)) {
        if (depth) return undefined;
        break;
      } else if (ch.charCodeAt(0) < 32 || "<>".includes(ch)) return undefined;
      pos += 1;
    }
    if (depth) return undefined;
  }
  const spacesStart = pos;
  while (pos < text.length && " \t\n\r".includes(text[pos]!)) pos += 1;
  if (pos < text.length && text[pos] === ")") return pos + 1;
  if (pos === spacesStart || pos >= text.length || !"\"'(".includes(text[pos]!)) return undefined;
  const closer = text[pos] === "(" ? ")" : text[pos]!;
  pos += 1;
  let closedTitle = false;
  while (pos < text.length) {
    if (text[pos] === "\\" && pos + 1 < text.length) {
      pos += 2;
      continue;
    }
    if (text[pos] === closer) {
      pos += 1;
      closedTitle = true;
      break;
    }
    if (match(BLANK_TITLE_LINE, text, pos)) return undefined;
    if (closer === ")" && text[pos] === "(") return undefined;
    pos += 1;
  }
  if (!closedTitle) return undefined;
  while (pos < text.length && " \t\n\r".includes(text[pos]!)) pos += 1;
  return pos < text.length && text[pos] === ")" ? pos + 1 : undefined;
};

const compareSpans = (a: readonly (number | string)[], b: readonly (number | string)[]): number => {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index];
    const right = b[index];
    if (left === right) continue;
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    return left < right ? -1 : 1;
  }
  return 0;
};

const inlineProtectedSpans = (text: string): Span[] => {
  const runs: (readonly [number, number])[] = [];
  for (const found of text.matchAll(/`+/g)) runs.push([found.index, found.index + found[0].length]);
  const byWidth = new Map<number, (readonly [number, number])[]>();
  for (const [start, end] of runs) {
    const list = byWidth.get(end - start) ?? [];
    list.push([start, end]);
    byWidth.set(end - start, list);
  }
  const startsByWidth = new Map([...byWidth].map(([width, pairs]) => [width, pairs.map((pair) => pair[0])]));
  const spans: Span[] = [];
  const brackets: number[] = [];
  const terminators = text.includes("<") ? terminatorPositions(text) : undefined;
  let pos = 0;
  while (pos < text.length) {
    const event = search(INLINE_EVENTS, text, pos);
    if (event === undefined) break;
    pos = event.start;
    const ch = text[pos]!;
    if (ch === "\\" && pos + 1 < text.length && ASCII_PUNCT.has(text[pos + 1]!)) {
      spans.push([pos, pos + 2, "escape"]);
      pos += 2;
      continue;
    }
    if (ch === "`") {
      let end = pos + 1;
      while (end < text.length && text[end] === "`") end += 1;
      const width = end - pos;
      const positions = startsByWidth.get(width) ?? [];
      const index = bisectLeft(positions, end);
      const closing = index < positions.length ? byWidth.get(width)![index]![1] : undefined;
      if (closing !== undefined) {
        spans.push([pos, closing, "inline_code"]);
        pos = closing;
        continue;
      }
      pos = end;
      continue;
    }
    if (ch === "<") {
      const auto = match(AUTOLINK, text, pos);
      if (auto) {
        spans.push([pos, auto.end, "autolink"]);
        pos = auto.end;
        continue;
      }
      const end = tagEnd(text, pos, terminators);
      if (end !== undefined) {
        spans.push([pos, end, "html_token"]);
        pos = end;
        continue;
      }
    }
    if (ch === "[") brackets.push(pos);
    else if (ch === "]" && brackets.length) {
      const opening = brackets.pop()!;
      if (pos + 1 < text.length && text[pos + 1] === "(") {
        const end = linkEnd(text, pos + 1);
        if (end !== undefined) {
          if (opening > 0 && text[opening - 1] === "!" && !escaped(text, opening - 1)) {
            spans.push([opening - 1, end, "image"]);
          } else spans.push([pos + 1, end, "link_destination"]);
          pos = end;
          continue;
        }
      }
    }
    if (text.startsWith("http://", pos) || text.startsWith("https://", pos) || text.startsWith("www.", pos)) {
      const www = text.startsWith("www.", pos);
      if (www && pos && !(unicodeWhitespace(text[pos - 1]!) || "*_~(".includes(text[pos - 1]!))) {
        pos += 1;
        continue;
      }
      const found = match(BARE_URL, text, pos);
      if (found) {
        let end = found.end;
        const domain = split(String.raw`[/?:#]`, found.group()!, 1)[0]!;
        const segments = domain.split(".");
        const validWww =
          segments.length >= 2 &&
          segments.every((part) => /^[A-Za-z0-9_-]+$/.test(part)) &&
          segments.slice(-2).every((part) => !part.includes("_")) &&
          (pos === 0 || unicodeWhitespace(text[pos - 1]!) || "*_~(".includes(text[pos - 1]!));
        if (!www || validWww) {
          while (end > pos && "?!.,:*_~".includes(text[end - 1]!)) end -= 1;
          const slice = text.slice(pos, end);
          let excess = slice.split(")").length - slice.split("(").length;
          while (excess > 0 && end > pos && text[end - 1] === ")") {
            end -= 1;
            excess -= 1;
          }
          spans.push([pos, end, "bare_url"]);
          pos = end;
          continue;
        }
      }
    }
    pos += 1;
  }
  return spans.sort(compareSpans);
};

const columns = (text: string): number => {
  let count = 0;
  for (const ch of text) {
    if (ch === " ") count += 1;
    else if (ch === "\t") count += 4 - (count % 4);
    else break;
  }
  return count;
};

const isDigitChar = (ch: string): boolean => /^\p{Nd}$/u.test(ch) || /^\p{No}$/u.test(ch);

const containers = (raw: string, allowList = true): readonly [number, number, boolean] => {
  if (raw && !" >".includes(raw[0]!) && (!allowList || (!"-+*".includes(raw[0]!) && !isDigitChar(raw[0]!)))) {
    return [0, 0, false];
  }
  let pos = 0;
  let quotes = 0;
  let listItem = false;
  while (pos < raw.length) {
    let candidate = pos;
    while (candidate < raw.length && candidate - pos < 3 && raw[candidate] === " ") candidate += 1;
    if (candidate < raw.length && raw[candidate] === ">") {
      quotes += 1;
      pos = candidate + 1;
      if (pos < raw.length && " \t".includes(raw[pos]!)) pos += 1;
      continue;
    }
    const marker = allowList ? match(CONTAINER_MARKER, raw, candidate) : undefined;
    if (marker) {
      listItem = true;
      pos = marker.end;
      continue;
    }
    break;
  }
  return [pos, quotes, listItem];
};

const physicalLines = (text: string): (readonly [number, string, string])[] => {
  const rows: (readonly [number, string, string])[] = [];
  let start = 0;
  for (const ending of text.matchAll(/\r\n|\r|\n/g)) {
    rows.push([start, text.slice(start, ending.index), ending[0]]);
    start = ending.index + ending[0].length;
  }
  rows.push([start, text.slice(start), ""]);
  return rows;
};

const stripChars = (text: string, chars: string): string => {
  let left = 0;
  let right = text.length;
  while (left < right && chars.includes(text[left]!)) left += 1;
  while (right > left && chars.includes(text[right - 1]!)) right -= 1;
  return text.slice(left, right);
};

const tableCells = (content: string): string[] => {
  const stripped = stripChars(content, " \t");
  const starts = [0];
  const ends: number[] = [];
  for (let index = 0; index < stripped.length; index += 1) {
    if (stripped[index] === "|" && !escaped(stripped, index)) {
      ends.push(index);
      starts.push(index + 1);
    }
  }
  ends.push(stripped.length);
  const cells = starts.map((left, index) => stripped.slice(left, ends[index]));
  if (stripped.startsWith("|")) cells.shift();
  if (stripped.endsWith("|") && !escaped(stripped, stripped.length - 1)) cells.pop();
  return cells;
};

class RowCursor {
  readonly lines: readonly string[];
  row: number;
  column: number;

  constructor(lines: readonly string[], row: number, column = 0) {
    this.lines = lines;
    this.row = row;
    this.column = column;
  }

  char(): string | undefined {
    const line = this.lines[this.row]!;
    if (this.column < line.length) return line[this.column];
    return this.row + 1 < this.lines.length ? "\n" : undefined;
  }

  following(): string | undefined {
    const line = this.lines[this.row]!;
    return this.column + 1 < line.length ? line[this.column + 1] : undefined;
  }

  advance(): void {
    if (this.column < this.lines[this.row]!.length) this.column += 1;
    else if (this.row + 1 < this.lines.length) {
      this.row += 1;
      this.column = 0;
    }
  }

  escape(): boolean {
    const next = this.following();
    if (this.char() === "\\" && next !== undefined && ASCII_PUNCT.has(next)) {
      this.advance();
      this.advance();
      return true;
    }
    return false;
  }
}

const isSpaceOrTab = (ch: string | undefined): boolean => ch === " " || ch === "\t";

const referenceGap = (cursor: RowCursor): boolean => {
  let seen = false;
  while (isSpaceOrTab(cursor.char())) {
    cursor.advance();
    seen = true;
  }
  if (cursor.char() === "\n") {
    cursor.advance();
    seen = true;
    while (isSpaceOrTab(cursor.char())) cursor.advance();
  }
  return seen;
};

const referenceDestination = (cursor: RowCursor): boolean => {
  if (cursor.char() === "<") {
    cursor.advance();
    while (cursor.char() !== undefined) {
      if (cursor.escape()) continue;
      if (cursor.char() === ">") {
        cursor.advance();
        return true;
      }
      if (cursor.char() === "<" || cursor.char() === "\n") return false;
      cursor.advance();
    }
    return false;
  }
  let count = 0;
  let depth = 0;
  while (cursor.char() !== undefined && !" \t\n".includes(cursor.char()!)) {
    const ch = cursor.char()!;
    if (cursor.escape()) {
      count += 2;
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code < 32 || code === 127 || "<>".includes(ch)) return false;
    if (ch === "(") {
      depth += 1;
      if (depth > 32) return false;
    } else if (ch === ")") {
      if (depth === 0) return false;
      depth -= 1;
    }
    cursor.advance();
    count += 1;
  }
  return count > 0 && depth === 0;
};

const referenceTitleEnd = (cursor: RowCursor): number | undefined => {
  const opener = cursor.char();
  const closer = opener === "(" ? ")" : opener;
  cursor.advance();
  while (cursor.char() !== undefined) {
    if (cursor.escape()) continue;
    const ch = cursor.char();
    if (ch === closer) {
      cursor.advance();
      while (isSpaceOrTab(cursor.char())) cursor.advance();
      return cursor.char() === undefined || cursor.char() === "\n" ? cursor.row : undefined;
    }
    if (opener === "(" && ch === "(") return undefined;
    if (ch === "\n" && !stripChars(cursor.lines[cursor.row + 1]!, " \t")) return undefined;
    cursor.advance();
  }
  return undefined;
};

const referenceDefinitionEnd = (lines: readonly string[], start: number, paragraphContext = false): number | undefined => {
  if (paragraphContext || !(start >= 0 && start < lines.length)) return undefined;
  const cursor = new RowCursor(lines, start);
  let spaces = 0;
  while (cursor.char() === " " && spaces < 3) {
    cursor.advance();
    spaces += 1;
  }
  if (cursor.char() !== "[") return undefined;
  cursor.advance();
  let labelLength = 0;
  let meaningful = false;
  while (cursor.char() !== undefined && cursor.char() !== "]") {
    const ch = cursor.char()!;
    if (cursor.escape()) {
      labelLength += 2;
      meaningful = true;
    } else {
      if (ch === "[") return undefined;
      if (ch === "\n" && !stripChars(cursor.lines[cursor.row + 1]!, " \t")) return undefined;
      meaningful ||= !" \t\n".includes(ch);
      labelLength += 1;
      cursor.advance();
    }
    if (labelLength > 999) return undefined;
  }
  if (cursor.char() !== "]" || !meaningful) return undefined;
  cursor.advance();
  if (cursor.char() !== ":") return undefined;
  cursor.advance();
  referenceGap(cursor);
  if (cursor.char() === undefined || cursor.char() === "\n" || !referenceDestination(cursor)) return undefined;
  const destinationRow = cursor.row;
  const separated = referenceGap(cursor);
  if (cursor.char() === undefined || cursor.char() === "\n") return destinationRow;
  if (!separated || !["\"", "'", "("].includes(cursor.char()!)) {
    return cursor.row > destinationRow ? destinationRow : undefined;
  }
  const titleOnLaterRow = cursor.row > destinationRow;
  const titleRow = referenceTitleEnd(cursor);
  return titleRow === undefined && titleOnLaterRow ? destinationRow : titleRow;
};

const PY_SPACE = /^[\s\u001c-\u001f\u0085]$/u;
const isPySpace = (ch: string | undefined): boolean => ch !== undefined && PY_SPACE.test(ch);
// 末尾の空白を正規表現の +$ で探すと、長い空白の並びで探す手間が字数の2乗になるので、両端から1字ずつ見る
const pyLstrip = (text: string): string => {
  let start = 0;
  while (start < text.length && isPySpace(text[start])) start += 1;
  return text.slice(start);
};
const pyRstrip = (text: string): string => {
  let end = text.length;
  while (end > 0 && isPySpace(text[end - 1])) end -= 1;
  return text.slice(0, end);
};
const pyStrip = (text: string): string => pyLstrip(pyRstrip(text));

const lstripChars = (text: string, chars: string): string => {
  let left = 0;
  while (left < text.length && chars.includes(text[left]!)) left += 1;
  return text.slice(left);
};

const PROTECTED_BLOCKS = new Set(["code", "frontmatter", "html_block", "reference_definition"]);
const OPEN_BLOCKS = new Set(["paragraph", "quote", "list"]);

const htmlBlockStart = (content: string, current: Block | undefined): string | undefined => {
  const htmlStart = lstripChars(content, " \t");
  if (htmlStart.startsWith("<!--")) return "-->";
  if (htmlStart.startsWith("<?")) return String.raw`\?>`;
  if (htmlStart.startsWith("<![CDATA[")) return String.raw`\]\]>`;
  if (/^<![A-Z]/.test(htmlStart)) return ">";
  if (/^<(?:script|pre|style|textarea)(?:[ \t>]|$)/i.test(htmlStart)) {
    const tag = /^<([A-Za-z]+)/.exec(htmlStart)![1]!;
    return `</${tag}${String.raw`\s*>`}`;
  }
  if (/^<\/?([A-Za-z][A-Za-z0-9-]*)(?:[ \t/>]|$)/.test(htmlStart)) {
    const tag = /^<\/?([A-Za-z][A-Za-z0-9-]*)/.exec(htmlStart)![1]!.toLowerCase();
    if (HTML_BLOCK_TAGS.has(tag)) return "blank";
    if (current === undefined || !OPEN_BLOCKS.has(current.kind)) {
      const end = tagEnd(htmlStart, 0);
      if (end !== undefined && !stripChars(htmlStart.slice(end), " \t")) return "blank";
    }
  }
  return undefined;
};

const analyzeMarkdown = (text: string, skipFrontmatter = true): Analysis => {
  const lines: Row[] = [];
  let blocks: Block[] = [];
  const protectedSpans: Span[] = [];
  let current: Block | undefined;
  let fence: readonly [string, number, number] | undefined;
  let htmlUntil: string | undefined;
  let activeListIndent = 0;
  const rawRows = physicalLines(text);
  let fmEnd = 0;
  if (skipFrontmatter && rawRows.length && pyStrip(rawRows[0]![1]) === "---") {
    for (let index = 1; index < rawRows.length; index += 1) {
      if (pyStrip(rawRows[index]![1]) === "---") {
        fmEnd = index + 1;
        break;
      }
    }
  }
  rawRows.forEach(([start, raw, ending], index) => {
    let [prefix, depth, listItem] = containers(raw);
    const [quotePrefix, quoteDepth] = containers(raw, false);
    const quoteContent = raw.slice(quotePrefix);
    if (
      match(THEMATIC, quoteContent) ||
      (current !== undefined && OPEN_BLOCKS.has(current.kind) && match(SETEXT, quoteContent))
    ) {
      [prefix, depth, listItem] = [quotePrefix, quoteDepth, false];
    }
    if (listItem) activeListIndent = prefix;
    else if (activeListIndent && depth && prefix >= activeListIndent) listItem = true;
    else if (activeListIndent && pyStrip(raw)) {
      const indent = raw.length - lstripChars(raw, " \t").length;
      if (depth === 0 && indent >= activeListIndent) {
        prefix = activeListIndent;
        listItem = true;
      } else if (depth === 0) activeListIndent = 0;
    }
    const content = raw.slice(prefix);
    const stripped = stripChars(content, " \t");
    const info: Row = {
      line: index + 1,
      raw,
      start,
      ending,
      content_start: start + prefix,
      content,
      quote_depth: depth,
      list_item: listItem,
      kind: "paragraph",
    };
    if (prefix) protectedSpans.push([start, start + prefix, "container_prefix"]);
    let kind: string | undefined;
    if (index < fmEnd) kind = "frontmatter";
    else if (fence !== undefined && depth < fence[2]) {
      fence = undefined;
      kind = undefined;
    }
    if (kind === undefined && fence !== undefined) {
      kind = "code";
      const closing = match(String.raw`^ {0,3}(` + escape(fence[0]) + `{${fence[1]},})` + String.raw`[ \t]*$`, content);
      if (closing) fence = undefined;
    }
    if (kind === undefined && htmlUntil !== undefined) {
      kind = "html_block";
      if (htmlUntil === "blank") {
        if (!stripped) htmlUntil = undefined;
      } else if (search(htmlUntil, content, 0, "i")) htmlUntil = undefined;
    }
    if (kind === undefined) {
      const marker = match(FENCE_OPEN, content);
      if (marker && !(marker.group(1)![0] === "`" && marker.group(2)!.includes("`"))) {
        kind = "code";
        fence = [marker.group(1)![0]!, marker.group(1)!.length, depth];
      } else if (columns(content) >= 4 && (current === undefined || current.kind === "code")) kind = "code";
      else if (!stripped) kind = "blank";
      else if (match(ATX_HEADING, content)) kind = "heading";
      else if (match(SETEXT, content) && current !== undefined && OPEN_BLOCKS.has(current.kind)) {
        current.kind = "heading";
        for (const earlier of current.lines) earlier.kind = "heading";
        kind = "heading_underline";
      } else if (match(THEMATIC, content)) kind = "thematic_break";
      else if (
        current !== undefined &&
        OPEN_BLOCKS.has(current.kind) &&
        current.lines.length &&
        content.includes("|") &&
        tableCells(content).length === tableCells(current.lines.at(-1)!.content).length &&
        tableCells(content).every((cell) => fullmatch(String.raw`[ \t]*:?-+:?[ \t]*`, cell))
      ) {
        const header = current.lines.pop()!;
        header.kind = "table";
        if (!current.lines.length) blocks.pop();
        blocks.push({ kind: "table", lines: [header] });
        current = undefined;
        kind = "table";
      } else if (current !== undefined && current.kind === "table" && content.includes("|")) kind = "table";
      else {
        htmlUntil = htmlBlockStart(content, current);
        if (htmlUntil !== undefined) {
          kind = "html_block";
          if (htmlUntil !== "blank" && search(htmlUntil, content, 0, "i")) htmlUntil = undefined;
        } else kind = listItem ? "list" : depth ? "quote" : "paragraph";
      }
    }
    info.kind = kind;
    lines.push(info);
    if (kind === "blank" || kind === "thematic_break" || kind === "heading_underline") {
      current = undefined;
      return;
    }
    if (PROTECTED_BLOCKS.has(kind)) protectedSpans.push([start, start + raw.length + ending.length, kind]);
    let continueBlock = current !== undefined && current.kind === kind && !["heading", "table", "list"].includes(kind);
    if (continueBlock && kind === "quote" && current!.lines[0]!.quote_depth !== depth) continueBlock = false;
    if (kind === "list" && current !== undefined && current.kind === "list" && !containers(raw)[2]) continueBlock = true;
    if (kind === "paragraph" && current !== undefined && current.kind === "quote" && depth === 0) {
      continueBlock = true;
      info.kind = "quote";
    }
    if (!continueBlock) {
      current = { kind: info.kind, lines: [] };
      blocks.push(current);
    }
    current!.lines.push(info);
  });
  const referenceBlocks: Block[] = [];
  for (const block of blocks) {
    const rows = block.lines;
    let offset = 0;
    if (["paragraph", "list", "quote", "heading"].includes(block.kind)) {
      const contents = rows.map((row) => row.content);
      while (offset < rows.length) {
        const end = referenceDefinitionEnd(contents, offset);
        if (end === undefined) break;
        const referenceRows = rows.slice(offset, end + 1);
        for (const row of referenceRows) {
          row.kind = "reference_definition";
          protectedSpans.push([row.start, row.start + row.raw.length + row.ending.length, "reference_definition"]);
        }
        referenceBlocks.push({ kind: "reference_definition", lines: referenceRows });
        offset = end + 1;
      }
    }
    if (offset < rows.length) referenceBlocks.push({ kind: block.kind, lines: rows.slice(offset) });
  }
  blocks = referenceBlocks;
  for (const block of blocks) {
    if (PROTECTED_BLOCKS.has(block.kind)) continue;
    const first = block.lines[0]!;
    const last = block.lines.at(-1)!;
    const begin = first.start;
    const finish = last.start + last.raw.length;
    const segment = text.slice(begin, finish).split("");
    for (const row of block.lines) {
      for (let position = row.start; position < row.content_start; position += 1) segment[position - begin] = " ";
    }
    for (const [left, right, spanKind] of inlineProtectedSpans(segment.join(""))) {
      protectedSpans.push([begin + left, begin + right, spanKind]);
    }
  }
  const ordered = protectedSpans.sort(compareSpans);
  const [merged, ends] = mergedMasks(ordered);
  return { text, lines, blocks, protected_spans: ordered, mask_spans: merged, mask_ends: ends };
};

const mergedMasks = (spans: Iterable<Span>): readonly [(readonly [number, number])[], number[]] => {
  const merged: [number, number][] = [];
  for (const [left, right] of [...spans].sort(compareSpans)) {
    const last = merged.at(-1);
    if (last && left <= last[1]) last[1] = Math.max(last[1], right);
    else merged.push([left, right]);
  }
  return [merged, merged.map(([, right]) => right)];
};

const kindMasks = (analysis: Analysis, kinds: Iterable<string>) => {
  const key = [...new Set(kinds)].sort().join("\u0000");
  analysis._kind_mask_cache ??= new Map();
  let found = analysis._kind_mask_cache.get(key);
  if (found === undefined) {
    const wanted = new Set(kinds);
    found = mergedMasks(analysis.protected_spans.filter((span) => wanted.has(span[2])));
    analysis._kind_mask_cache.set(key, found);
  }
  return { key, found };
};

const lineVisibleText = (analysis: Analysis, lineNo: number, protectedKinds?: Iterable<string>): string => {
  const kinds = protectedKinds === undefined ? undefined : [...protectedKinds];
  const cacheKey = `${lineNo}\u0001${kinds === undefined ? "*" : [...new Set(kinds)].sort().join("\u0000")}`;
  analysis._line_visible_cache ??= new Map();
  const cached = analysis._line_visible_cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const row = analysis.lines[lineNo - 1]!;
  const start = row.start;
  const end = start + row.raw.length;
  const remember = (value: string) => {
    analysis._line_visible_cache!.set(cacheKey, value);
    return value;
  };
  if (!analysis.protected_spans.length) return remember(row.raw);
  const [masks, ends] = kinds === undefined ? [analysis.mask_spans, analysis.mask_ends] : kindMasks(analysis, kinds).found;
  const begin = bisectRight(ends, start);
  if (begin >= masks.length || masks[begin]![0] >= end) return remember(row.raw);
  const visible = row.raw.split("");
  for (let index = begin; index < masks.length; index += 1) {
    const [left, right] = masks[index]!;
    if (left >= end) break;
    for (let position = Math.max(left, start); position < Math.min(right, end); position += 1) {
      if (!"\r\n".includes(visible[position - start]!)) visible[position - start] = " ";
    }
  }
  return remember(visible.join(""));
};

const rangeOverlapsProtected = (analysis: Analysis, start: number, end: number, protectedKinds?: Iterable<string>): boolean => {
  if (end <= start) return false;
  const [masks, ends] =
    protectedKinds === undefined ? [analysis.mask_spans, analysis.mask_ends] : kindMasks(analysis, protectedKinds).found;
  const index = bisectRight(ends, start);
  return index < masks.length && masks[index]![0] < end;
};

export {
  analyzeMarkdown,
  bisectRight,
  lineVisibleText,
  pyLstrip,
  pyRstrip,
  pyStrip,
  rangeOverlapsProtected,
  stripChars,
  unicodeWhitespace,
};
export type { Analysis, Block, Row, Span };
