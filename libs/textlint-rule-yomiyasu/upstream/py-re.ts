// Python の re の書き方を JavaScript の RegExp（u フラグ）に読み替える。
// yomiyasu の型は Python で書かれているので、型の文字列は元のまま写し、ここで読み替える。
const WORD = String.raw`\p{L}\p{N}_\p{Mn}\p{Mc}`;
const DIGIT = String.raw`\p{Nd}`;
const SYNTAX = new Set("^$\\.*+?()[]{}|/-".split(""));
const CLASS_SYNTAX = new Set("\\]^-[".split(""));
const ESCAPES = new Set("dDwWsSbBnrtfv0123456789AZkpPux".split(""));

const translate = (source: string): string => {
  let out = "";
  let inClass = false;
  for (let index = 0; index < source.length; index += 1) {
    const ch = source[index]!;
    if (ch === "\\") {
      const next = source[index + 1] ?? "";
      index += 1;
      if (next === "d") out += inClass ? DIGIT : `[${DIGIT}]`;
      else if (next === "D") out += inClass ? String.raw`\P{Nd}` : String.raw`\P{Nd}`;
      else if (next === "w") out += inClass ? WORD : `[${WORD}]`;
      else if (next === "W") out += `[^${WORD}]`;
      else if (next === "A") out += "^";
      else if (next === "Z") out += "$";
      else if (next === "b" && !inClass) out += String.raw`(?:(?<=[${WORD}])(?![${WORD}])|(?<![${WORD}])(?=[${WORD}]))`;
      else if (next === "B" && !inClass) out += String.raw`(?:(?<=[${WORD}])(?=[${WORD}])|(?<![${WORD}])(?![${WORD}]))`;
      else if (next === "u" && /^[0-9a-fA-F]{4}$/.test(source.slice(index + 1, index + 5))) {
        out += `\\u{${source.slice(index + 1, index + 5)}}`;
        index += 4;
      } else if (next === "U" && /^[0-9a-fA-F]{8}$/.test(source.slice(index + 1, index + 9))) {
        out += `\\u{${source.slice(index + 1, index + 9).replace(/^0+(?=.)/, "")}}`;
        index += 8;
      } else if (next === "x" && /^[0-9a-fA-F]{2}$/.test(source.slice(index + 1, index + 3))) {
        out += `\\x${source.slice(index + 1, index + 3)}`;
        index += 2;
      } else if (ESCAPES.has(next) || (inClass ? CLASS_SYNTAX.has(next) : SYNTAX.has(next))) {
        out += `\\${next}`;
      } else if (inClass && SYNTAX.has(next)) {
        out += `\\${next}`;
      } else out += next === "/" ? "\\/" : next;
      continue;
    }
    if (inClass) {
      if (ch === "]") inClass = false;
      if (ch === "[") {
        out += "\\[";
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === "[") {
      inClass = true;
      out += ch;
      if (source[index + 1] === "^") {
        out += "^";
        index += 1;
      }
      if (source[index + 1] === "]") {
        out += "\\]";
        index += 1;
      }
      continue;
    }
    if (ch === "(" && source.startsWith("(?P<", index)) {
      out += "(?<";
      index += 3;
      continue;
    }
    if (ch === "(" && source.startsWith("(?P=", index)) {
      const end = source.indexOf(")", index);
      out += `\\k<${source.slice(index + 4, end)}>`;
      index = end;
      continue;
    }
    if (ch === "{" && !/^\{\d*(?:,\d*)?\}/.test(source.slice(index))) {
      out += "\\{";
      continue;
    }
    if (ch === "}") {
      const before = out.lastIndexOf("{");
      const opened = before >= 0 && out[before - 1] !== "\\" && /^\{\d*(?:,\d*)?$/.test(out.slice(before));
      out += opened ? "}" : "\\}";
      continue;
    }
    out += ch;
  }
  return out.replace(/\{,(\d+)\}/g, "{0,$1}");
};

const cache = new Map<string, RegExp>();

// flags は Python の re.I などに当たるもの（"i"）。y は位置を固定した match に使う。
const compile = (source: string, flags = ""): RegExp => {
  const key = `${flags}\u0000${source}`;
  let found = cache.get(key);
  if (found === undefined) {
    found = new RegExp(translate(source), `u${flags}`);
    cache.set(key, found);
  }
  return found;
};

type Pattern = Readonly<{ source: string; flags: string; anchored: RegExp; anywhere: RegExp }>;

const pattern = (source: string, flags = ""): Pattern => ({
  source,
  flags,
  anchored: compile(source, `${flags}y`),
  anywhere: compile(source, `${flags}g`),
});

type Match = Readonly<{ start: number; end: number; group: (name?: number | string) => string | undefined; groups: RegExpExecArray }>;

const wrap = (found: RegExpExecArray): Match => ({
  start: found.index,
  end: found.index + found[0].length,
  group: (name = 0) => (typeof name === "number" ? found[name] : found.groups?.[name]),
  groups: found,
});

const asPattern = (value: Pattern | string, flags = ""): Pattern => (typeof value === "string" ? pattern(value, flags) : value);

// re.match(p, text, pos)
const match = (value: Pattern | string, text: string, pos = 0, flags = ""): Match | undefined => {
  const regex = asPattern(value, flags).anchored;
  regex.lastIndex = pos;
  const found = regex.exec(text);
  return found === null ? undefined : wrap(found);
};

// re.fullmatch(p, text)
const fullmatch = (value: Pattern | string, text: string, flags = ""): Match | undefined => {
  const source = asPattern(value, flags);
  return match(pattern(`(?:${source.source})$`, source.flags), text);
};

// re.search(p, text, pos)
const search = (value: Pattern | string, text: string, pos = 0, flags = ""): Match | undefined => {
  const regex = asPattern(value, flags).anywhere;
  regex.lastIndex = pos;
  const found = regex.exec(text);
  return found === null ? undefined : wrap(found);
};

// re.finditer(p, text)
const finditer = (value: Pattern | string, text: string, flags = ""): Match[] => {
  const regex = asPattern(value, flags).anywhere;
  const out: Match[] = [];
  regex.lastIndex = 0;
  for (let found = regex.exec(text); found !== null; found = regex.exec(text)) {
    out.push(wrap(found));
    if (found[0].length === 0) regex.lastIndex += 1;
  }
  return out;
};

// re.findall の件数（グループの中身は使わない）
const count = (value: Pattern | string, text: string, flags = ""): number => finditer(value, text, flags).length;

// re.sub(p, replacement, text)
const sub = (value: Pattern | string, replacement: string | ((found: Match) => string), text: string, flags = ""): string => {
  let out = "";
  let last = 0;
  for (const found of finditer(value, text, flags)) {
    out += text.slice(last, found.start) + (typeof replacement === "string" ? replacement : replacement(found));
    last = found.end;
  }
  return out + text.slice(last);
};

// re.split(p, text)（グループの中身は返さない）
const split = (value: Pattern | string, text: string, maxsplit = 0, flags = ""): string[] => {
  const out: string[] = [];
  let last = 0;
  for (const found of finditer(value, text, flags)) {
    if (maxsplit && out.length >= maxsplit) break;
    if (found.end === found.start && found.start === last && found.start !== 0 && found.start === text.length) continue;
    out.push(text.slice(last, found.start));
    last = found.end;
  }
  out.push(text.slice(last));
  return out;
};

const escape = (text: string): string => text.replace(/[\\^$.*+?()[\]{}|\-/#&~ \t\n\r\v\f]/g, "\\$&");

export { escape, finditer, fullmatch, match, pattern, search, split, sub };
export type { Match, Pattern };
