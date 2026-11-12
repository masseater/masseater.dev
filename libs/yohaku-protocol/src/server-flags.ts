const SERVER_FLAGS = {
  dataDirectory: "data-dir",
  parentPid: "parent-pid",
} as const;

const MCP_PORT = 47_210;

const MCP_PATH = "/mcp";

export { MCP_PATH, MCP_PORT, SERVER_FLAGS };
