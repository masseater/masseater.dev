export interface PathConfig {
  readonly ignore?: readonly string[];
}

export interface SelfHostedRunner {
  readonly labels?: readonly string[];
}

export type Persona = "regular" | "pedantic" | "auditor";

export type Severity = "informational" | "low" | "medium" | "high";

export type Confidence = "low" | "medium" | "high";

export interface AuditConfig {
  readonly rules?: Readonly<Record<string, unknown>>;
  readonly persona?: Persona;
  readonly minSeverity?: Severity;
  readonly minConfidence?: Confidence;
  readonly githubHost?: string;
  readonly online?: boolean;
}

export interface Fu4Config {
  readonly audit?: AuditConfig;
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
  readonly severity: "error";
}
