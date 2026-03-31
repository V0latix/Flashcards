/**
 * GitHub-style activity heatmap.
 * Renders 365 days as a grid of small squares (7 rows × ~53 cols).
 * Color intensity reflects the number of reviews per day.
 */

import { useMemo } from "react";
import type { ActivityDay } from "../../stats/types";
import { useI18n } from "../../i18n/useI18n";
import { parseDateKey } from "../../utils/date";

type Props = {
  days: ActivityDay[];
};

/** Map level 0–4 to CSS variables so the heatmap respects light/dark theme. */
const LEVEL_VAR: Record<number, string> = {
  0: "var(--heatmap-0)",
  1: "var(--heatmap-1)",
  2: "var(--heatmap-2)",
  3: "var(--heatmap-3)",
  4: "var(--heatmap-4)",
};

/** Short month label for a YYYY-MM-DD date key. */
const shortMonth = (dateKey: string, locale: string) => {
  const date = parseDateKey(dateKey);
  return date.toLocaleString(locale, { month: "short", timeZone: "UTC" });
};

/**
 * Organise flat days array into columns (one column = one week, Mon=row 0).
 * Prepends null-padding so day[0] lands on its correct weekday row.
 */
function buildWeekColumns(days: ActivityDay[]): (ActivityDay | null)[][] {
  if (days.length === 0) return [];

  const firstDate = parseDateKey(days[0].date);
  // ISO weekday: Mon=1 … Sun=7. We want Mon=0 … Sun=6.
  const startPad = (firstDate.getUTCDay() + 6) % 7;

  const flat: (ActivityDay | null)[] = [
    ...Array<null>(startPad).fill(null),
    ...days,
  ];

  const columns: (ActivityDay | null)[][] = [];
  for (let i = 0; i < flat.length; i += 7) {
    columns.push(flat.slice(i, i + 7));
  }
  return columns;
}

/** Compute which columns deserve a month label. */
function buildMonthLabels(
  columns: (ActivityDay | null)[][],
  locale: string,
): Map<number, string> {
  const labels = new Map<number, string>();
  let lastMonth = "";
  columns.forEach((col, idx) => {
    const firstReal = col.find((c) => c !== null);
    if (!firstReal) return;
    const month = shortMonth(firstReal.date, locale);
    if (month !== lastMonth) {
      labels.set(idx, month);
      lastMonth = month;
    }
  });
  return labels;
}

export default function ActivityHeatmap({ days }: Props) {
  const { t, language } = useI18n();
  const locale = language === "fr" ? "fr-FR" : "en-US";

  const columns = useMemo(() => buildWeekColumns(days), [days]);
  const monthLabels = useMemo(
    () => buildMonthLabels(columns, locale),
    [columns, locale],
  );

  const hasActivity = days.some((d) => d.count > 0);
  const totalReviews = days.reduce((sum, d) => sum + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  return (
    <div className="card section stats-heatmap">
      <h2>{t("stats.heatmapTitle")}</h2>
      <p className="stats-heatmap-summary">
        {t("stats.heatmapSummary", { total: totalReviews, days: activeDays })}
      </p>

      {!hasActivity ? (
        <p className="muted">{t("status.none")}</p>
      ) : (
        <>
          {/* Month labels row */}
          <div className="heatmap-grid-wrap">
            <div
              className="heatmap-month-row"
              style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
            >
              {columns.map((_, idx) => (
                <span key={idx} className="heatmap-month-label">
                  {monthLabels.get(idx) ?? ""}
                </span>
              ))}
            </div>

            {/* Day-of-week labels + cell grid */}
            <div className="heatmap-body">
              <div className="heatmap-dow">
                {[
                  t("stats.dow.mon"),
                  "",
                  t("stats.dow.wed"),
                  "",
                  t("stats.dow.fri"),
                  "",
                  "",
                ].map((label, i) => (
                  <span key={i} className="heatmap-dow-label">
                    {label}
                  </span>
                ))}
              </div>

              <div
                className="heatmap-grid"
                style={{
                  gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                }}
              >
                {columns.map((col, colIdx) =>
                  col.map((day, rowIdx) => (
                    <div
                      key={`${colIdx}-${rowIdx}`}
                      className="heatmap-cell"
                      style={{
                        backgroundColor: day
                          ? LEVEL_VAR[day.level]
                          : "transparent",
                      }}
                      title={
                        day
                          ? `${day.date} — ${day.count} ${t("stats.reviewsUnit")}`
                          : undefined
                      }
                    />
                  )),
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="heatmap-legend">
            <span className="muted">{t("stats.heatmapLess")}</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className="heatmap-cell"
                style={{ backgroundColor: LEVEL_VAR[level] }}
              />
            ))}
            <span className="muted">{t("stats.heatmapMore")}</span>
          </div>
        </>
      )}
    </div>
  );
}
