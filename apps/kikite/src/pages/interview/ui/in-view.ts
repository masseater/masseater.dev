import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const useInView = (key: string): RefObject<HTMLElement | null> => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (key !== "" && ref.current !== null) {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [key]);
  return ref;
};

export { useInView };
