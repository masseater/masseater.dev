import type { ReactNode } from "react";

import { Notice } from "./notice.tsx";

const LOADING = "読み込んでいます…";

const Loading = (): ReactNode => <Notice>{LOADING}</Notice>;

export { Loading };
