export interface RemoteUrl {
  readonly href: string;
  readonly protocol: string;
  readonly hostname: string;
  readonly pathname: string;
}

export type RepoModel =
  | {
      readonly type: "remote";
      readonly repo: string;
      readonly url: RemoteUrl;
      readonly rev: string;
    }
  | { readonly type: "special"; readonly repo: string };

export interface PreCommitConfigModel {
  readonly repos: readonly RepoModel[];
}

export interface PreCommitHooksModel {
  readonly hooks: readonly string[];
}
