export interface PathConfig {
  readonly ignore?: readonly string[];
}

export interface SelfHostedRunner {
  readonly labels?: readonly string[];
}

export interface Fu4Config {
  readonly selfHostedRunner?: SelfHostedRunner;
  readonly configVariables?: readonly string[] | null;
  readonly paths?: Readonly<Record<string, PathConfig>>;
  readonly ignores?: readonly string[];
}

export interface Diagnostic {
  readonly path: string;
  readonly line: number;
  readonly column: number;
  readonly rule: string;
  readonly message: string;
}
