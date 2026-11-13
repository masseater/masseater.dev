import { EditorView } from "@codemirror/view";

const SERIF = "'Noto Serif JP Variable', serif";
const SANS = "'Noto Sans JP Variable', sans-serif";

const writingTheme = EditorView.theme({
  "&": {
    fontFamily: SERIF,
    fontSize: "16px",
    color: "var(--foreground)",
    backgroundColor: "transparent",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "inherit", lineHeight: "2.1", overflow: "visible" },
  ".cm-content": { padding: "0", caretColor: "var(--foreground)" },
  ".cm-cursor": { borderLeftColor: "var(--foreground)" },
  ".cm-line": { padding: "0 0 28px" },
  ".cm-line.yohaku-note": {
    fontFamily: SANS,
    fontSize: "15px",
    lineHeight: "1.8",
    color: "var(--muted-foreground)",
  },
  ".cm-gutters": { backgroundColor: "transparent", border: "none" },
  ".yohaku-kinds": {
    width: "128px",
    paddingRight: "32px",
    boxSizing: "border-box",
    textAlign: "right",
    fontFamily: SANS,
    fontSize: "12px",
    lineHeight: "2.1",
    color: "var(--muted-foreground)",
  },
  ".yohaku-remark": {
    textDecoration: "underline dashed var(--remark)",
    textUnderlineOffset: "6px",
  },
});

export { writingTheme };
