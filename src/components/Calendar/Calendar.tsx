import {
  currentMonthState,
  eventsState,
  selectedDateState,
  selectedEventState,
} from "@store/atoms";
import { Event } from "@types";
import {
  getCalendarDays,
  isCurrentDay,
  isCurrentMonth,
  isSameDayAs,
  weekDays,
} from "@utils/calendar";
import { generateRecurringEvents, isEventOnDate } from "@utils/eventUtils";
import dayjs from "dayjs";
import React from "react";
import { isMultiDayEvent, layoutEventSpans } from "../../utils/eventSpans";
import SpanningEvents from "./SpanningEvents";
import HolidayDate from "./HolidayDate";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import styles from "./Calendar.module.scss";
import { workspaceSettingsState } from '../../store/workspace';
import { lunarLabel } from "../../utils/lunar";
import { koreanHolidayName, hasHolidayData } from '../../utils/holidays';

// CalendarDay 컴포넌트를 메모이제이션
const CalendarDay = React.memo(
  ({
    date,
    dayEvents,
    isSelected,
    isToday,
    isInCurrentMonth,
    holiday,
    lunar,
    onDateClick,
    onEventClick,
  }: {
    date: Date;
    dayEvents: Event[];
    isSelected: boolean;
    isToday: boolean;
    isInCurrentMonth: boolean;
    holiday: string;
    lunar: string;
    onDateClick: (date: Date) => void;
    onEventClick: (event: Event, date: Date) => void;
  }) => {
    return (
      <div
        key={date.toISOString()}
        className={`${styles.calendarDay}
        ${!isInCurrentMonth ? styles.otherMonth : ""}
        ${isSelected ? styles.selected : ""}
        ${isToday ? styles.today : ""}`}
        onClick={() => onDateClick(date)}
      >
        <div className={styles.dayHeading}>
          <HolidayDate holiday={holiday} className={styles.dayNumber}>{date.getDate()}</HolidayDate>
          {lunar && <small style={{fontSize:9,opacity:0.65}}>{lunar}</small>}
        </div>
        <div className={styles.dayContent}>
          {dayEvents.length > 0 && (
            <div className={styles.eventList}>
              {dayEvents.slice(0, 2).map((event) => (
                <div
                  key={event.id}
                  className={styles.eventItem}
                  style={{ borderLeftColor: event.color, cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event, date);
                  }}
                >
                  <span className={styles.eventTime}>{event.startTime}</span>
                  <span className={styles.eventTitle}>{event.title}</span>
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className={styles.moreEvents}>
                  +{dayEvents.length - 2}개 더
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

const Calendar: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useRecoilState(currentMonthState);
  const [selectedDate, setSelectedDate] = useRecoilState(selectedDateState);
  const setSelectedEvent = useSetRecoilState(selectedEventState);
  const events = useRecoilValue(eventsState);

  const settings = useRecoilValue(workspaceSettingsState);

  const calendarDays = React.useMemo(
    () => getCalendarDays(currentMonth),
    [currentMonth]
  );

  // 반복 이벤트를 포함한 모든 이벤트를 한 번만 생성 (메모이제이션)
  const expandedEvents = React.useMemo(() => {
    const rangeStart = dayjs(currentMonth)
      .subtract(1, "month")
      .startOf("month")
      .toDate();
    const rangeEnd = dayjs(currentMonth)
      .add(1, "month")
      .endOf("month")
      .toDate();

    const allEvents: Event[] = [];

    events.forEach((event) => {
      if (event.recurrence) {
        // 반복 이벤트 확장
        const instances = generateRecurringEvents(event, rangeStart, rangeEnd);
        allEvents.push(...instances);
      } else {
        // 단일 이벤트
        allEvents.push(event);
      }
    });

    return allEvents;
  }, [events, currentMonth]);

  const getEventsForDate = React.useCallback(
    (date: Date): Event[] => {
      // 이미 확장된 이벤트 목록에서 필터링
      const filtered = expandedEvents.filter((event) =>
        isEventOnDate(event, date)
      );

      // 시간순으로 정렬: 종일 이벤트 → 시간 이벤트 (시간순)
      return filtered.sort((a, b) => {
        // 종일 이벤트는 맨 앞으로
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        if (a.isAllDay && b.isAllDay) return 0;

        // 시간이 있는 이벤트는 시간순으로 정렬
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }

        // 시작 시간이 없는 이벤트는 뒤로
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;

        return 0;
      });
    },
    [expandedEvents]
  );


  const handleDateClick = React.useCallback(
    (date: Date) => {
      setSelectedEvent(null);
      setSelectedDate(date);
    },
    [setSelectedDate,setSelectedEvent]
  );

  const dayEventsByDate = React.useMemo(() => new Map(calendarDays.map(date =>
    [date.getTime(), getEventsForDate(date)])), [calendarDays, getEventsForDate]);

  const handleEventClick = React.useCallback(
    (event: Event, date: Date) => {
      setSelectedEvent(event);
      setSelectedDate(date);
    },
    [setSelectedEvent, setSelectedDate]
  );

  return (
    <div className={styles.calendar} style={{ '--calendar-rows': calendarDays.length / 7 } as React.CSSProperties}>
      <div className={styles.weekDays}>
        {weekDays.map((day) => (
          <div key={day} className={styles.weekDay}>
            {day}
          </div>
        ))}
      </div>
      {settings.koreanHolidays && !hasHolidayData(currentMonth.getFullYear()) && <small className={styles.holidayNotice}>이 연도의 공휴일 정보는 아직 준비되지 않았습니다.</small>}
      <div className={`${styles.calendarGrid} ${settings.multiDayDisplay === 'connected' ? styles.connectedGrid : ''}`}>
        {settings.multiDayDisplay === 'daily' ? calendarDays.map(date=>(
          <CalendarDay key={date.toISOString()} date={date} dayEvents={dayEventsByDate.get(date.getTime())!} isSelected={isSameDayAs(date,selectedDate)} isToday={isCurrentDay(date)} isInCurrentMonth={isCurrentMonth(date,currentMonth)} lunar={settings.lunarVisible?lunarLabel(date):''} holiday={settings.koreanHolidays?koreanHolidayName(date):''} onDateClick={handleDateClick} onEventClick={handleEventClick} />
        )) : Array.from({length:calendarDays.length/7},(_,row)=>{
          const days=calendarDays.slice(row*7,row*7+7);
          const spans=layoutEventSpans(expandedEvents,days);
          const lanes=Math.max(0,...spans.map(s=>s.lane+1));
          return <div key={row} className={styles.calendarWeek} style={{'--span-space':`${lanes*24}px`,minHeight:88+lanes*24} as React.CSSProperties}>
            {days.map(date=><CalendarDay key={date.toISOString()} date={date} dayEvents={dayEventsByDate.get(date.getTime())!.filter(e=>!isMultiDayEvent(e))} isSelected={isSameDayAs(date,selectedDate)} isToday={isCurrentDay(date)} isInCurrentMonth={isCurrentMonth(date,currentMonth)} lunar={settings.lunarVisible?lunarLabel(date):''} holiday={settings.koreanHolidays?koreanHolidayName(date):''} onDateClick={handleDateClick} onEventClick={handleEventClick} />)}
            {!!spans.length && <div className={styles.weekSpans}><SpanningEvents spans={spans} onClick={event=>handleEventClick(event,days.find(d=>isEventOnDate(event,d))!)} /></div>}
          </div>;
        })}
      </div>
    </div>
  );
};

export default Calendar;
