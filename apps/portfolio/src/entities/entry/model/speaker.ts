import { Schema } from "effect";

export const speakers = {
  masseater: { name: "masseater", avatar: "/avatars/masseater.png", side: "end" },
  claude: { name: "Claude", avatar: "/avatars/claude.svg", side: "start" },
} as const;

export const SpeakerSchema = Schema.Literals(["masseater", "claude"]);

export type Speaker = typeof SpeakerSchema.Type;

export type Side = (typeof speakers)[Speaker]["side"];
