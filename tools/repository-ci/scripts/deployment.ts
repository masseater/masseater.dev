export const ENVIRONMENT = "production";

export const deployTask = (stack: string): string => `deploy:${stack}`;
