import { Option } from "effect";

export interface Issue {
  readonly severity: "error" | "warning";
  readonly cut: Option.Option<string>;
  readonly message: string;
}

const NO_ISSUES: readonly Issue[] = [];

export const scriptError = (message: string): Issue => ({
  severity: "error",
  cut: Option.none(),
  message,
});

export const cutError = ({ cut, message }: Readonly<{ cut: string; message: string }>): Issue => ({
  severity: "error",
  cut: Option.some(cut),
  message,
});

export const issueIf = ({
  failed,
  issue,
}: Readonly<{ failed: boolean; issue: () => Issue }>): readonly Issue[] => {
  if (failed) {
    return [issue()];
  }
  return NO_ISSUES;
};
