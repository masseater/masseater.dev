export interface Finding {
  readonly path: string;
  readonly line: number;
  readonly column: number;
  readonly rule: string;
  readonly message: string;
}

const FIRST = 1;

export interface FileFinding {
  readonly path: string;
  readonly rule: string;
  readonly message: string;
}

export const atFile = ({ path, rule, message }: FileFinding): Finding => ({
  path,
  line: FIRST,
  column: FIRST,
  rule,
  message,
});
