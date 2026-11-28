import type { McpServer, McpServerFactory } from "@modelcontextprotocol/server";
import { SkillsExtension, memorySkillFiles } from "@modelcontextprotocol/server/ext/skills";
import type { SkillCatalog } from "@modelcontextprotocol/server/ext/skills";
import { run } from "@r_masseater/workers-tracing/effect";
import { Array as Arr, Effect, Record as Rec, pipe } from "effect";

export type ServerSkill = Readonly<{ name: string; description: string; body: string }>;

const SKILL_FILE = "SKILL.md";

const markdownOf = ({ name, description, body }: ServerSkill): string =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`;

const entryOf = (skill: ServerSkill): readonly [string, string] => [
  `${skill.name}/${SKILL_FILE}`,
  markdownOf(skill),
];

export const skillCatalog = (skills: readonly ServerSkill[]): Promise<SkillCatalog> => {
  const files = pipe(skills, Arr.map(entryOf), Rec.fromEntries);
  return SkillsExtension.load(memorySkillFiles(files), { strict: true });
};

export const withSkills =
  (catalog: Promise<SkillCatalog>) =>
  (build: () => McpServer): McpServerFactory =>
  () =>
    pipe(
      Effect.promise(() => catalog),
      Effect.map((loaded) => {
        const server = build();
        loaded.attach(server);
        return server;
      }),
      run,
    );
