import { Config } from "@remotion/cli/config";

import { webpackOverride } from "./src/shared/lib/webpack.ts";

Config.setEntryPoint("src/app/index.ts");
Config.overrideWebpackConfig(webpackOverride);
