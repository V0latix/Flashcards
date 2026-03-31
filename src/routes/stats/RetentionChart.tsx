/**
 * Bar chart showing review success rate per Leitner box.
 * X-axis: box number (1–5, starting from which box the review was made).
 * Y-axis: % of "good" answers out of total answers at that box level.
 */

import type { BoxRetentionStat } from "../../stats/types";
import { useI18n } from "../../i18n/useI18n";

type Props = {
  data: BoxRetentionStat[];
};

export default function RetentionChart({ data }: Props) {
  const { t } = useI18n();

  const reviewedBoxes = data.filter((b) => b.totalReviews > 0);
  const hasData = reviewedBoxes.length > 0;

  return (
    <div className="card section stats-retention">
      <h2>{t("stats.retentionTitle")}</h2>
      <p className="muted">{t("stats.retentionSubtitle")}</p>

      {!hasData ? (
        <p>{t("stats.noData")}</p>
      ) : (
        <>
          <div className="retention-chart">
            {data.map((stat) => {
              const rate = stat.successRate;
              const pct = rate === null ? 0 : Math.round(rate * 100);
              const isEmpty = stat.totalReviews === 0;
              return (
                <div key={stat.box} className="retention-col">
                  <div
                    className="retention-bar-wrap"
                    title={
                      isEmpty
                        ? t("stats.noData")
                        : `${pct}% (${stat.goodCount}/${stat.totalReviews})`
                    }
                  >
                    {!isEmpty && (
                      <div
                        className="retention-bar"
                        style={{ height: `${pct}%` }}
                      />
                    )}
                    {!isEmpty && <span className="retention-pct">{pct}%</span>}
                  </div>
                  <div className="retention-label">
                    {t("labels.box")} {stat.box}
                  </div>
                  {!isEmpty && (
                    <div className="retention-count muted">
                      {stat.totalReviews}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="muted retention-hint">{t("stats.retentionHint")}</p>
        </>
      )}
    </div>
  );
}
