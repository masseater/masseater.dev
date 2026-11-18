import { Array as Arr, Record as Rec, String as Str, pipe } from "effect";

import { joinPath } from "#/entities/action/index.ts";
import data from "#/shared/data/action.json" with { type: "json" };
import { quote } from "#/shared/text/index.ts";

import { DOCS, checkRuns } from "./action-runs.ts";
import type { Local } from "./action-runs.ts";

const ICONS: readonly string[] = data.icons;
const COLORS: readonly string[] = data.colors;

const isUnknown = (value: string, known: readonly string[]): boolean =>
  Str.isNonEmpty(value) && !Arr.contains(known, Str.toLowerCase(value));

const checkBranding = (local: Local, name: string, path: string): void => {
  const { branding } = local.action.metadata;
  if (isUnknown(branding.icon, ICONS)) {
    local.fail(
      local.uses,
      `incorrect icon name ${quote(branding.icon)} at branding.icon in metadata of ${name} action at ${path}. see the official document to know the exhaustive list of supported icons: ${DOCS}#brandingicon`,
    );
  }
  if (isUnknown(branding.color, COLORS)) {
    local.fail(
      local.uses,
      `incorrect color ${quote(branding.color)} at branding.icon in metadata of ${name} action at ${path}. see the official document to know the exhaustive list of supported colors: ${DOCS}#brandingcolor`,
    );
  }
};

const checkDeprecations = (local: Local, name: string, path: string): void => {
  const silent = pipe(
    Rec.values(local.action.metadata.inputs),
    Arr.filter((input) => input.deprecated && Str.isEmpty(input.deprecationMessage)),
  );
  for (const input of silent) {
    local.fail(
      local.uses,
      `input ${quote(input.name)} is deprecated but "deprecationMessage" is empty in metadata of ${name} action at ${path}`,
    );
  }
};

export const checkMetadata = (local: Local): void => {
  const { metadata } = local.action;
  const path = quote(joinPath(local.action.shown)(local.action.file));
  if (Str.isEmpty(metadata.name)) {
    local.fail(local.uses, `name is required in action metadata ${path}`);
  }
  const name = quote(metadata.name);
  if (Str.isEmpty(metadata.description)) {
    local.fail(local.uses, `description is required in metadata of ${name} action at ${path}`);
  }
  checkBranding(local, name, path);
  checkDeprecations(local, name, path);
  checkRuns(local);
};
