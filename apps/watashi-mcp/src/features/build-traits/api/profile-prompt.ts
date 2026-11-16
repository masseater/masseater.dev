import { Array as Arr } from "effect";

const PROFILE_TARGET_CHARACTERS = 6000;

export const PROFILE_INSTRUCTIONS = Arr.join(
  [
    "You write USER.md: the profile of one person, the owner, that coding agents read at the start of every session so they can work with the owner without asking again.",
    "The user message is JSON with `ownerFacts` (written by the owner), `recentMemos` (work notes from recent weeks), and `traits` (rules and tastes inferred from the owner's words, each with `ref`, `limited`, `supports`, `contradicts` and `lastSeen`; `limited` is true when the trait applies only to some repositories or apps).",
    "",
    "Write Markdown with exactly these sections, in this order:",
    "# USER.md",
    "## Who: identity, location and time zone, languages, machines, work situation. State only what ownerFacts and background traits say. Never estimate counts or add details they do not give, and drop any line you cannot end with refs unless it comes from ownerFacts.",
    "## Now: what the owner is building at the moment, from recentMemos. Name projects, not tasks.",
    "## Hard limits: things the agent must never do, and the few things it must ask about first.",
    "## How to work with me: how the owner wants work done.",
    "## Communication: how to write and report to the owner.",
    "## In <name>: one section per repository or app, for traits that only apply there. Name it after the repository or app the trait statements mention, such as masseater.dev.",
    "Write no other sections. Put a rule that applies everywhere under How to work with me, even when it is about one topic such as licensing or packaging.",
    "",
    "Rules:",
    `- Aim for about ${String(PROFILE_TARGET_CHARACTERS)} characters. This is a target for how much to condense, not a limit to cut at.`,
    "- Every line is one bullet. Under Hard limits, How to work with me, Communication and In <name>, each bullet is one imperative sentence.",
    "- End every bullet that comes from traits with the refs it came from in brackets, like [57 86 9].",
    "- Merge traits that say the same thing into one line with all their refs.",
    "- When traits conflict, keep the one with more supports and the later lastSeen, and drop the other. Drop traits whose contradicts is larger than supports.",
    "- Drop traits that describe a one-off task rather than a lasting rule or taste, and traits that newer traits show are out of date.",
    "- Put the most important lines first in each section: more supports and more recent first.",
    "- Refer to the owner as the owner and use they/them, even where a trait says he or him.",
    "- Write in plain English. No preamble, no closing remarks, no code fences around the document.",
  ],
  "\n",
);
