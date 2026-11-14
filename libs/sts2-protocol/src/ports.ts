const BRIDGE_BASE_PORT = 47_100;

const JOIN_CLIENT_ID_BASE = 999;

const bridgePort = (instance: number): number => BRIDGE_BASE_PORT + instance;

export { BRIDGE_BASE_PORT, JOIN_CLIENT_ID_BASE, bridgePort };
