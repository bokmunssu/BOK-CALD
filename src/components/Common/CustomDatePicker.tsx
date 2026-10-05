import React, { useState } from "react";
import LunarDateInput from "./LunarDateInput";
import { toLunar, type LunarDate } from "../../utils/lunar";
import DatePicker from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./CustomDatePicker.module.scss";

interface CustomDatePickerProps {
  id?: string;
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  minDate?: Date;
  maxDate?: Date;
  showTimeSelect?: boolean;
  timeIntervals?: number;
  dateFormat?: string;
  className?: string;
  disabled?: boolean;
  lunar?: LunarDate;
  onLunarChange?: (lunar?: LunarDate) => void;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  id,
  selected,
  onChange,
  placeholderText = "날짜를 선택하세요",
  minDate,
  maxDate,
  showTimeSelect = false,
  timeIntervals = 30,
  dateFormat = showTimeSelect ? "yyyy/MM/dd h:mmaa" : "yyyy/MM/dd",
  className = "",
  disabled = false,
  lunar,
  onLunarChange,
}) => {
  const [basis, setBasis] = useState(!!lunar);
  return (
    <div className={`${styles.datePickerWrapper} ${className}`}>
      <div className={styles.basisSwitch}>
        <button
          type="button"
          disabled={disabled}
          aria-label="양력 날짜 선택"
          aria-pressed={!basis}
          onClick={() => {
            setBasis(false);
            onLunarChange?.(undefined);
          }}
        >
          양력
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label="음력 날짜 선택"
          aria-pressed={basis}
          onClick={() => {
            setBasis(true);
            const l = selected && toLunar(selected);
            if (l) onLunarChange?.(l);
          }}
        >
          음력
        </button>
      </div>
      {basis ? (
        <LunarDateInput
          selected={selected}
          onChange={onChange}
          onBasisChange={onLunarChange}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
        />
      ) : (
        <DatePicker
          id={id}
          selected={selected}
          onChange={onChange}
          locale={ko}
          dateFormat={dateFormat}
          placeholderText={placeholderText}
          minDate={minDate}
          maxDate={maxDate}
          showTimeSelect={showTimeSelect}
          timeIntervals={timeIntervals}
          disabled={disabled}
          className={styles.datePickerInput}
          calendarClassName={styles.datePickerCalendar}
          dayClassName={(date) =>
            date.getDay() === 0
              ? styles.sunday
              : date.getDay() === 6
                ? styles.saturday
                : ""
          }
          showPopperArrow={false}
          popperClassName={styles.datePickerPopper}
          popperPlacement="bottom-start"
          popperProps={{
            strategy: "fixed",
          }}
        />
      )}
    </div>
  );
};

export default CustomDatePicker;
