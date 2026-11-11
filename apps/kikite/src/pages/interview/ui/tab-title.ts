import { useEffect } from "react";

const TITLE = "kikite";

const useTabTitle = (question: string): void => {
  useEffect(() => {
    const shown = (): void => {
      if (document.hidden && question !== "") {
        document.title = question;
        return;
      }
      document.title = TITLE;
    };
    shown();
    document.addEventListener("visibilitychange", shown);
    return (): void => {
      document.removeEventListener("visibilitychange", shown);
      document.title = TITLE;
    };
  }, [question]);
};

export { useTabTitle };
