export type AccessPolicy = Readonly<{
  name: string;
  decision: string;
  include: readonly string[];
}>;

export type AccessApp = Readonly<{
  name: string;
  type: string;
  destinations: readonly string[];
  publicPaths: readonly string[];
  policies: readonly AccessPolicy[];
  oauth: boolean;
}>;

export type WorkerScript = Readonly<{
  name: string;
  workersDev: boolean;
  previews: boolean;
  storage: readonly string[];
}>;

export type CustomDomain = Readonly<{ hostname: string; service: string }>;

export type WorkerRoute = Readonly<{ pattern: string; script: string }>;

export type Bucket = Readonly<{ name: string; devUrl: boolean; customDomains: readonly string[] }>;

export type DnsRecord = Readonly<{ name: string; type: string; content: string; proxied: boolean }>;

export type McpServer = Readonly<{ name: string; url: string }>;

export type PagesProject = Readonly<{ name: string; domains: readonly string[] }>;

export type Repository = Readonly<{ id: string; name: string; private: boolean }>;

export type Inventory = Readonly<{
  zones: readonly string[];
  workersSubdomain: string;
  apps: readonly AccessApp[];
  scripts: readonly WorkerScript[];
  domains: readonly CustomDomain[];
  routes: readonly WorkerRoute[];
  buckets: readonly Bucket[];
  records: readonly DnsRecord[];
  mcpServers: readonly McpServer[];
  pages: readonly PagesProject[];
  repositories: readonly Repository[];
}>;
