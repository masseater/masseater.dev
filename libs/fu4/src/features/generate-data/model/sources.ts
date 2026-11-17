export const DOCS_ROOT = "https://raw.githubusercontent.com/github/docs/refs/heads/main";

const REFERENCE = `${DOCS_ROOT}/content/actions/reference`;

export const CONTEXTS = `${REFERENCE}/workflows-and-actions/contexts.md`;

export const EVENTS = `${REFERENCE}/workflows-and-actions/events-that-trigger-workflows.md`;

export const STANDARD_RUNNERS = `${REFERENCE}/runners/github-hosted-runners.md`;

export const LARGER_RUNNERS = `${REFERENCE}/runners/larger-runners.md`;

export const SELF_HOSTED = `${DOCS_ROOT}/content/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow.md`;

export const SHELLS = `${DOCS_ROOT}/data/reusables/actions/supported-shells.md`;

const SCHEMAS = "https://raw.githubusercontent.com/SchemaStore/schemastore/master/src/schemas/json";

export const WORKFLOW_SCHEMA = `${SCHEMAS}/github-workflow.json`;

export const ACTION_SCHEMA = `${SCHEMAS}/github-action.json`;

export const POPULAR_SEED =
  "https://raw.githubusercontent.com/rhysd/actionlint/v1.7.12/scripts/generate-popular-actions/popular_actions.json";

export const rawFile = (path: string): string => `https://raw.githubusercontent.com/${path}`;

export const WORKFLOW_PARSER_SCHEMA =
  "https://raw.githubusercontent.com/actions/languageservices/main/workflow-parser/src/workflow-v1.0.json";
