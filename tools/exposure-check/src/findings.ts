import { Array as Arr, Boolean as Bool, Order, String as Str, pipe } from "effect";

import { accessFindings } from "./access-findings.ts";
import { finding, fingerprint } from "./fingerprint.ts";
import type { Finding, Scene } from "./fingerprint.ts";
import type { Bucket } from "./inventory.ts";
import { fromProbe } from "./probe-findings.ts";
import type { ProbeResult } from "./probes.ts";
import { isCovered } from "./surface.ts";
import { workerFindings } from "./worker-findings.ts";

const PROXIABLE_TYPES: readonly string[] = ["A", "AAAA", "CNAME"];
const TUNNEL_SUFFIX = ".cfargotunnel.com";
const R2_DEV = "r2.dev";

const bucketUrls = (bucket: Bucket): readonly string[] => [
  ...Bool.match(bucket.devUrl, { onFalse: (): readonly string[] => [], onTrue: () => [R2_DEV] }),
  ...bucket.customDomains,
];

const publicBuckets = ({ inventory }: Scene): readonly Finding[] =>
  pipe(
    inventory.buckets,
    Arr.filter((bucket) => Arr.isReadonlyArrayNonEmpty(bucketUrls(bucket))),
    Arr.map((bucket) =>
      finding({
        kind: "public-bucket",
        subject: bucket.name,
        detail: `R2 のバケット ${bucket.name} が ${Arr.join(bucketUrls(bucket), "・")} で誰にでも読める`,
      }),
    ),
  );

const dnsOnly = ({ inventory, surface }: Scene): readonly Finding[] =>
  pipe(
    inventory.records,
    Arr.filter(
      (record) =>
        Arr.contains(surface.hosts, record.name) &&
        Arr.contains(PROXIABLE_TYPES, record.type) &&
        !record.proxied,
    ),
    Arr.map((record) =>
      finding({
        kind: "dns-only",
        subject: record.name,
        detail: `${record.name} の DNS がプロキシを通らず、Access を飛ばして ${record.content} に届く`,
      }),
    ),
  );

const tunnels = ({ inventory }: Scene): readonly Finding[] =>
  pipe(
    inventory.records,
    Arr.filter(
      (record) => Str.endsWith(TUNNEL_SUFFIX)(record.content) && !isCovered(inventory)(record.name),
    ),
    Arr.map((record) =>
      finding({
        kind: "tunnel",
        subject: record.name,
        detail: `トンネルの ${record.name} を守る Access のアプリが無い`,
      }),
    ),
  );

const pagesFindings = ({ inventory, surface }: Scene): readonly Finding[] =>
  pipe(
    inventory.pages,
    Arr.filter((project) =>
      pipe(
        project.domains,
        Arr.some((domain) => Arr.contains(surface.hosts, domain)),
      ),
    ),
    Arr.map((project) =>
      finding({
        kind: "pages",
        subject: project.name,
        detail: `Pages の ${project.name} が ${project.name}.pages.dev で Access を通らずに開ける`,
      }),
    ),
  );

const publicRepositories = ({ inventory, surface }: Scene): readonly Finding[] =>
  pipe(
    inventory.repositories,
    Arr.filter(
      (repository) => Arr.contains(surface.repositories, repository.id) && !repository.private,
    ),
    Arr.map((repository) =>
      finding({
        kind: "repository-public",
        subject: repository.id,
        detail: `private だったリポジトリ ${repository.name} が public になっている`,
      }),
    ),
  );

const DETECTORS: readonly ((scene: Scene) => readonly Finding[])[] = [
  accessFindings,
  workerFindings,
  publicBuckets,
  dnsOnly,
  tunnels,
  pagesFindings,
  publicRepositories,
];

export const findExposures = (
  scene: Scene & Readonly<{ probes: readonly ProbeResult[] }>,
): readonly Finding[] =>
  pipe(
    [
      ...pipe(scene.probes, Arr.flatMap(fromProbe)),
      ...pipe(
        DETECTORS,
        Arr.flatMap((detect) => detect(scene)),
      ),
    ],
    Arr.dedupeWith((left, right) => fingerprint(left) === fingerprint(right)),
    Arr.sortWith(fingerprint, Order.String),
  );
