import { Array as Arr } from "effect";

const PROFILE_TARGET_CHARACTERS = 6000;

const PROFILE_TARGET_ITEMS = 50;

const MERGE_TARGET_RULES = 80;

const MAX_WORDS = 25;

export const MERGE_INSTRUCTIONS = Arr.join(
  [
    "You organize the rules and tastes of one person, the owner, for USER.md, the profile that coding agents read at the start of every session.",
    "The user message is JSON with `traits`: each has `ref`, `kind`, `limited` (true when it applies only to some repositories or apps), `statement`, `supports`, `contradicts` and `lastSeen`.",
    "",
    "Read every trait first. Then group the traits that say the same thing or are parts of one rule, and write one rule for each group with the refs of every trait in it.",
    "",
    "Sections:",
    "- limits: things the agent must never do, and the few things it must ask about first.",
    "- work: how the owner wants work done, everywhere.",
    "- communication: how to write and report to the owner.",
    "- who: facts about the owner from background traits, such as machines, languages and situation. Write these as plain statements, not commands.",
    "- repo: rules that apply only in one repository or app; set `repo` to the name the statement mentions, such as masseater.dev. Leave `repo` empty in every other section.",
    "",
    "Rules:",
    "- Use each ref at most once.",
    `- Merge every group of traits that say the same thing, however they are worded, but keep different rules apart. Aim for about ${String(MERGE_TARGET_RULES)} rules in total.`,
    "- A rule holds one instruction. Never pack several instructions into one rule with semicolons or lists, even when they share a repository.",
    "- Leave out traits that describe a one-off task rather than a lasting rule, traits that a newer trait shows are out of date, and traits whose contradicts is larger than supports.",
    `- Write each rule as one imperative sentence of at most ${String(MAX_WORDS)} words in plain English, keeping the concrete names from the traits. Refer to the owner as the owner, with they/them.`,
  ],
  "\n",
);

export const EDIT_INSTRUCTIONS = Arr.join(
  [
    "You edit USER.md, the profile of one person, the owner, that coding agents read at the start of every session so they can work with the owner without asking again.",
    "The user message is JSON with `rules` (merged from many observations; each has `id`, `section`, `repo`, `rule` and `weight`, where a higher weight means the owner said it more often), `ownerFacts` (written by the owner) and `recentMemos` (work notes from recent weeks).",
    "",
    "Read the whole set first, then write:",
    "- summary: 3 to 5 short sentences, one per entry, that an agent must know above everything else: who the owner is, how they want work done, and the strictest limits.",
    "- who: facts about the owner, each citing the ids of the who rules it comes from, plus facts from ownerFacts with no ids. Leave it short rather than guess.",
    "- now: 3 to 6 projects the owner is building, from recentMemos. Name projects, not tasks.",
    "- sections: one entry each for limits, work and communication, and one entry for each `repo` value of the repo rules, keeping its 1 to 5 most important items. Group the items of each section into 2 to 6 topics whose titles differ from the section name. A section with only a few items may have a single topic.",
    "",
    "How to edit:",
    `- The whole document should come to about ${String(PROFILE_TARGET_CHARACTERS)} characters, around ${String(PROFILE_TARGET_ITEMS)} items. This is a guide to how much to condense, not a limit to cut at.`,
    "- Merge items that say the same thing, even across sections, into one item listing all their ids, and keep it in the section where it matters most. Never join different rules into one item with semicolons or lists.",
    `- Rewrite each item as one imperative sentence of at most ${String(MAX_WORDS)} words, keeping concrete names and dropping explanations an agent does not need.`,
    "- Every item lists the `id` values of the rules it comes from, such as R12, in `ids` and never in `text`. Use each id at most once.",
    "- Condense by leaving out narrow, low-weight rules. Keep every rule of weight 3 or more.",
    "- Refer to the owner as the owner, with they/them. Write plain English.",
  ],
  "\n",
);
