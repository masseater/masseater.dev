import { site } from "#/shared/config";
import { seo } from "#/shared/lib";
import type { Head } from "#/shared/lib";

const homeHead: Head = seo({
  title: site.name,
  description: site.description,
  path: "/",
  type: "website",
});

export { homeHead };
