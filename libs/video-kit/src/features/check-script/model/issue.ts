import { Option } from "effect";

export interface Issue {
  readonly severity: "error" | "warning";
  readonly scene: Option.Option<string>;
  readonly message: string;
}

const NO_ISSUES: readonly Issue[] = [];

export const scriptError = (message: string): Issue => ({
  severity: "error",
  scene: Option.none(),
  message,
});

export const sceneError = ({
  scene,
  message,
}: Readonly<{ scene: string; message: string }>): Issue => ({
  severity: "error",
  scene: Option.some(scene),
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
