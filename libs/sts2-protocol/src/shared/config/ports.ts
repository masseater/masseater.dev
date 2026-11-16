export const BRIDGE_BASE_PORT = 47_100;

export const JOIN_CLIENT_ID_BASE = 999;

export const bridgePort = (instance: number): number => BRIDGE_BASE_PORT + instance;
