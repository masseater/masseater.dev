import { Schema } from "effect";

const speakers = {
  masseater: { name: "masseater", avatar: "/avatars/masseater.png", side: "end" },
  claude: { name: "Claude", avatar: "/avatars/claude.svg", side: "start" },
} as const;

const SpeakerSchema = Schema.Literals(["masseater", "claude"]);

type Speaker = typeof SpeakerSchema.Type;

type Side = (typeof speakers)[Speaker]["side"];

export type { Side, Speaker };
export { SpeakerSchema, speakers };
