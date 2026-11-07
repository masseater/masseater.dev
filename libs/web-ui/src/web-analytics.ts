const WEB_ANALYTICS_BEACON = {
  src: "https://static.cloudflareinsights.com/beacon.min.js/v8c78df7c7c0f484497ecbca7046644da1771523124516",
  integrity:
    "sha512-8DS7rgIrAmghBFwoOTujcf6D9rXvH8xm8JQ1Ja01h9QX8EzXldiszufYa4IFfKdLUKTTrnSFXLDkUEOTrZQ8Qg==",
  crossOrigin: "anonymous",
} as const;

const WEB_ANALYTICS_REPORT_ORIGIN = "https://cloudflareinsights.com";

export { WEB_ANALYTICS_BEACON, WEB_ANALYTICS_REPORT_ORIGIN };
