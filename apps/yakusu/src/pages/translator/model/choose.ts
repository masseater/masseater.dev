import { otherOf } from "./languages.ts";
import type { LanguageCode } from "./languages.ts";
import { useSelect, useSelection } from "./selection.ts";
import type { Selection, Source } from "./selection.ts";

const otherSideOf = ({
  current,
  code,
}: Readonly<{ current: Selection; code: LanguageCode }>): LanguageCode => {
  if (current.source.kind === "language") {
    return current.source.code;
  }
  return otherOf(code);
};

const sourceChoice = ({
  current,
  source,
}: Readonly<{ current: Selection; source: Source }>): Selection => {
  if (source.kind === "language" && source.code === current.target) {
    return { source, target: otherSideOf({ current, code: source.code }) };
  }
  return { source, target: current.target };
};

const targetChoice = ({
  current,
  target,
}: Readonly<{ current: Selection; target: LanguageCode }>): Selection => {
  if (current.source.kind === "language" && current.source.code === target) {
    return { source: { kind: "language", code: current.target }, target };
  }
  return { source: current.source, target };
};

const useChooseSource = (): ((source: Source) => void) => {
  const select = useSelect();
  const current = useSelection();
  return (source) => {
    select(sourceChoice({ current, source }));
  };
};

const useChooseTarget = (): ((target: LanguageCode) => void) => {
  const select = useSelect();
  const current = useSelection();
  return (target) => {
    select(targetChoice({ current, target }));
  };
};

export { useChooseSource, useChooseTarget };
