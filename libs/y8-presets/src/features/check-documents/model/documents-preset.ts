import { definePlugin } from "@r_masseater/y8";
import type { Plugin, Y8Config } from "@r_masseater/y8";

import { turned, whenGiven, withOptions } from "#/features/check-documents/lib/preset.ts";
import type { RuleSet } from "#/features/check-documents/lib/preset.ts";

import {
  linkForwardSlash,
  linkTargetExists,
  noEmail,
  noLocalPath,
  noPlaceholder,
} from "./general-rules.ts";

const DOCUMENTS: RuleSet = {
  plugin: "docs",
  rules: {
    "link-target-exists": linkTargetExists,
    "link-forward-slash": linkForwardSlash,
    "no-local-path": noLocalPath,
    "no-email": noEmail,
    "no-placeholder": noPlaceholder,
  },
};

export const documentsPlugin: Plugin = definePlugin({ rules: DOCUMENTS.rules });

export interface DocumentsOptions {
  readonly emails?: readonly string[];
}

export const documents = (options: DocumentsOptions = {}): Y8Config => ({
  plugins: { [DOCUMENTS.plugin]: documentsPlugin },
  rules: {
    ...turned("error")(DOCUMENTS),
    ...whenGiven((allow) => withOptions(DOCUMENTS.plugin)("no-email", { allow }))(options.emails),
  },
});
