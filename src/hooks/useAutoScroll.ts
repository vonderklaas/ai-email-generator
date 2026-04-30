import { useEffect, useRef } from "react";

export function useAutoScroll<TDependency>(dependency: TDependency) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof element.scrollTo === "function") {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [dependency]);

  return ref;
}
