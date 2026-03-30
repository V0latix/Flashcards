import { useI18n } from "../../i18n/useI18n";

const SUSPENDED_BOX = -1;
const boxOptions = [0, 1, 2, 3, 4, 5];

type Props = {
  selectedBoxes: number[];
  boxCounts: Record<number, number>;
  suspendedCount: number;
  onToggle: (box: number) => void;
  onClear: () => void;
};

function BoxFilterBar({
  selectedBoxes,
  boxCounts,
  suspendedCount,
  onToggle,
  onClear,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="panel-actions">
      <span className="chip">{t("labels.boxes")}</span>
      <div className="filter-group">
        {boxOptions.map((box) => (
          <button
            key={box}
            type="button"
            className={`btn btn-secondary btn-toggle${selectedBoxes.includes(box) ? " is-active" : ""}`}
            onClick={() => onToggle(box)}
          >
            {box} ({boxCounts[box] ?? 0})
          </button>
        ))}
        <button
          type="button"
          className={`btn btn-secondary btn-toggle${selectedBoxes.includes(SUSPENDED_BOX) ? " is-active" : ""}`}
          onClick={() => onToggle(SUSPENDED_BOX)}
        >
          {t("labels.suspended")} ({suspendedCount})
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClear}
          disabled={selectedBoxes.length === 0}
        >
          {t("library.clearBoxes")}
        </button>
      </div>
    </div>
  );
}

export default BoxFilterBar;
