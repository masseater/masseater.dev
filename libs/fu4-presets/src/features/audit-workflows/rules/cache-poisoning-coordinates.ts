import { Array as Arr, pipe } from "effect";

import {
  all,
  any,
  configurable,
  field,
  fixed,
  lessThan,
} from "#/features/audit-workflows/lib/coordinate.ts";
import type { Coordinate } from "#/features/audit-workflows/model/coordinate.ts";

const BOOLEAN = { type: "boolean" } as const;
const FREE = { type: "free-string" } as const;

const NODE_CACHE = any(
  field("opt-in")("cache")({ type: "exact", items: ["npm", "yarn", "pnpm"] })(false),
  field("opt-in")("package-manager-cache")(BOOLEAN)(true),
);

const UV_LEGACY = all(lessThan("v10"), field("opt-in")("enable-cache")(BOOLEAN)(true));

const UV_CACHE = any(
  field("opt-in")("enable-cache")({ type: "exact", items: ["true"] })(false),
  UV_LEGACY,
);

const BUILDX_CACHE = all(
  field("opt-in")("cache-binary")(BOOLEAN)(true),
  field("opt-in")("version")(FREE)(false),
);

const COMPOSER_CACHE = field("opt-out")("ignore-cache")({
  type: "exact",
  items: ["yes", "true", "1"],
})(true);

export const CACHE_AWARE: readonly Coordinate[] = [
  configurable("actions/cache")(field("opt-out")("lookup-only")(BOOLEAN)(true)),
  configurable("actions/setup-java")(field("opt-in")("cache")(FREE)(false)),
  configurable("actions/setup-go")(field("opt-in")("cache")(BOOLEAN)(true)),
  configurable("actions/setup-node")(NODE_CACHE),
  configurable("actions/setup-python")(field("opt-in")("cache")(FREE)(false)),
  configurable("actions/setup-dotnet")(field("opt-in")("cache")(BOOLEAN)(false)),
  configurable("astral-sh/setup-uv")(UV_CACHE),
  configurable("Swatinem/rust-cache")(field("opt-out")("lookup-only")(BOOLEAN)(true)),
  configurable("ruby/setup-ruby")(field("opt-in")("bundler-cache")(BOOLEAN)(false)),
  configurable("PyO3/maturin-action")(field("opt-in")("sccache")(BOOLEAN)(false)),
  configurable("mlugg/setup-zig")(field("opt-in")("use-cache")(BOOLEAN)(true)),
  configurable("oven-sh/setup-bun")(field("opt-out")("no-cache")(BOOLEAN)(true)),
  configurable("pnpm/setup")(field("opt-in")("cache")(BOOLEAN)(false)),
  configurable("DeterminateSystems/magic-nix-cache-action")(
    field("opt-in")("use-gha-cache")(BOOLEAN)(true),
  ),
  configurable("graalvm/setup-graalvm")(field("opt-in")("cache")(FREE)(false)),
  configurable("gradle/actions/setup-gradle")(field("opt-out")("cache-disabled")(BOOLEAN)(true)),
  configurable("docker/setup-buildx-action")(BUILDX_CACHE),
  configurable("actions-rust-lang/setup-rust-toolchain")(field("opt-in")("cache")(BOOLEAN)(true)),
  fixed("Mozilla-Actions/sccache-action"),
  fixed("nix-community/cache-nix-action"),
  configurable("jdx/mise-action")(field("opt-in")("cache")(BOOLEAN)(true)),
  configurable("ramsey/composer-install")(COMPOSER_CACHE),
  fixed("awalsh128/cache-apt-pkgs-action"),
];

const RELEASERS = [
  "pypa/gh-action-pypi-publish",
  "rubygems/release-gem",
  "jreleaser/release-action",
  "goreleaser/goreleaser-action",
  "softprops/action-gh-release",
  "release-drafter/release-drafter",
  "googleapis/release-please-action",
];

const DEPLOYERS = [
  "redhat-actions/push-to-registry",
  "aws-actions/amazon-ecs-deploy-task-definition",
  "aws-actions/aws-cloudformation-github-deploy",
  "Azure/aci-deploy",
  "Azure/container-apps-deploy-action",
  "Azure/functions-action",
  "Azure/sql-action",
  "cloudflare/wrangler-action",
  "google-github-actions/deploy-appengine",
  "google-github-actions/deploy-cloudrun",
  "google-github-actions/deploy-cloud-functions",
];

const fixedAll = (uses: readonly string[]): readonly Coordinate[] => pipe(uses, Arr.map(fixed));

export const PUBLISHERS: readonly Coordinate[] = [
  ...fixedAll(RELEASERS),
  configurable("docker/build-push-action")(field("opt-in")("push")(BOOLEAN)(true)),
  ...fixedAll(DEPLOYERS),
];
