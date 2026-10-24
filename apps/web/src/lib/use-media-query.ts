import { useMemo, useSyncExternalStore } from "react";
export function useMediaQuery(query: string) {
  const media = useMemo(() => window.matchMedia(query), [query]);
  return useSyncExternalStore(
    (callback) => {
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => media.matches,
  );
}
