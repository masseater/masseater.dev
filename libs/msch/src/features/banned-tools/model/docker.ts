import { Array as Arr, Option, pipe } from "effect";

import type { Listed } from "#/shared/lib/scanned-files.ts";

import { checkBannedTool } from "./banned-tool.ts";
import type { BannedTool } from "./banned-tool.ts";

const RENAMES: readonly (readonly [pattern: RegExp, name: string])[] = [
  [/(?:^|\/)Dockerfile(?:\.[^/]+)?$|\.dockerfile$/iu, "Containerfile"],
  [/(?:^|\/)(?:[^/]+)?\.dockerignore$/u, ".containerignore"],
  [/(?:^|\/)docker-compose(?:\.[^/]+)?\.ya?ml$/u, "compose.yaml"],
];

const COMMAND_PATTERNS: readonly RegExp[] = [
  /(?<![\w./@-])docker[ \t]+(?:build|buildx|compose|run|push|pull|login|logout|exec|tag|image|images|ps|rm|rmi|stop|start|kill|save|load|create|cp|inspect|logs|network|volume|system|manifest|context|container)\b/gu,
  /(?<![\w./@-])docker-compose[ \t]+(?:up|down|build|run|exec|pull|push|ps|logs|stop|start|restart|config)\b/gu,
  /(?:\bcommand["']?\s*[:=]\s*|(?:\bspawn\w*|\bexec\w*|\bexeca|Command::new|ChildProcess\.make|\$)\(\s*)["'`]docker(?:-compose)?["'`]/gu,
  /\buses:\s*["']?docker(?:\/[\w.-]+|:\/\/)/gu,
];

const renameOf = ({ name }: Listed): Option.Option<string> =>
  pipe(
    RENAMES,
    Arr.findFirst(([pattern]) => pattern.test(name)),
    Option.map(([, renamed]) => renamed),
  );

const DOCKER: BannedTool = {
  fileRule: "docker-file",
  commandRule: "docker-command",
  isFile: (entry) => Option.isSome(renameOf(entry)),
  patternsFor: () => COMMAND_PATTERNS,
  fileMessage: (entry) =>
    `Docker is not used in this repository: podman builds and runs containers. Name this file ${Option.getOrElse(renameOf(entry), () => "for podman")}, the name podman reads.`,
  commandMessage: (command) =>
    `Docker is not used in this repository. Replace \`${command}\` with podman, which takes the same arguments.`,
};

/** @internal */
export const checkDocker = (root: string): ReturnType<typeof checkBannedTool> =>
  checkBannedTool(root, DOCKER);
