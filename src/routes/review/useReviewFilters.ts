import { useMemo } from "react";

export function useReviewFilters(searchParams: URLSearchParams) {
  const tagFilter = searchParams.get("tag")?.trim() || null;

  const selectedBox = useMemo(() => {
    const rawBox = searchParams.get("box");
    if (!rawBox) return null;
    const parsed = Number.parseInt(rawBox, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return null;
    return parsed;
  }, [searchParams]);

  const isTraining = searchParams.get("mode") === "training";

  return { tagFilter, selectedBox, isTraining };
}
