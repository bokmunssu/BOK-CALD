import { useEffect, useState, useRef } from "react";
import styles from "./CustomDatePicker.module.scss";
import { toLunar, toSolar, type LunarDate } from "../../utils/lunar";
export default function LunarDateInput({
  selected,
  onChange,
  onBasisChange,
  disabled,
  minDate,
  maxDate,
}: {
  selected: Date | null;
  onChange: (d: Date | null) => void;
  onBasisChange?: (l: LunarDate) => void;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}) {
  const [value, setValue] = useState<LunarDate>(
    () => toLunar(selected || new Date()) || { year: 2026, month: 1, day: 1 },
  );
  const [error, setError] = useState("");
  const yearInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    yearInput.current?.setCustomValidity(error);
  }, [error]);
  useEffect(() => {
    if (selected) {
      const l = toLunar(selected);
      if (l) setValue(l);
    }
  }, [selected?.getTime()]);
  const update = (patch: Partial<LunarDate>) => {
    const next = { ...value, ...patch };
    setValue(next);
    const solar = toSolar(next);
    if (
      !solar ||
      (minDate && solar < minDate) ||
      (maxDate && solar > maxDate)
    ) {
      setError("지원 범위 내의 유효한 음력 날짜·윤달을 선택해 주세요.");
      return;
    }
    setError("");
    onChange(solar);
    onBasisChange?.(next);
  };
  return (
    <div>
      <div className={styles.lunarFields}>
        <input
          ref={yearInput}
          aria-label="음력 연도"
          type="number"
          min={1000}
          max={2050}
          required
          value={value.year}
          disabled={disabled}
          onChange={(e) => update({ year: Number(e.target.value) })}
        />
        년
        <select
          aria-label="음력 월"
          value={value.month}
          disabled={disabled}
          onChange={(e) => update({ month: Number(e.target.value) })}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}월
            </option>
          ))}
        </select>
        <select
          aria-label="음력 일"
          value={value.day}
          disabled={disabled}
          onChange={(e) => update({ day: Number(e.target.value) })}
        >
          {Array.from({ length: 30 }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}일
            </option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            aria-label="윤달"
            checked={!!value.intercalation}
            disabled={disabled}
            onChange={(e) => update({ intercalation: e.target.checked })}
          />
          윤달
        </label>
      </div>
      {error ? (
        <small className={styles.lunarHelp} role="alert">
          {error}
        </small>
      ) : (
        selected && (
          <small className={styles.lunarHelp}>
            양력 {selected.getFullYear()}.{selected.getMonth() + 1}.
            {selected.getDate()} · 반복 일정은 양력 기준
          </small>
        )
      )}
    </div>
  );
}
