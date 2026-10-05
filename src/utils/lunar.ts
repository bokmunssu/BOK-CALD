import KoreanLunarCalendar from "korean-lunar-calendar";
export interface LunarDate {
  year: number;
  month: number;
  day: number;
  intercalation?: boolean;
}
export function toLunar(date: Date): LunarDate | null {
  const c = new KoreanLunarCalendar();
  return c.setSolarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
    ? c.getLunarCalendar()
    : null;
}
export function toSolar(value: LunarDate): Date | null {
  const c = new KoreanLunarCalendar();
  if (
    !c.setLunarDate(value.year, value.month, value.day, !!value.intercalation)
  )
    return null;
  const actual = c.getLunarCalendar();
  if (
    actual.year !== value.year ||
    actual.month !== value.month ||
    actual.day !== value.day ||
    !!actual.intercalation !== !!value.intercalation
  )
    return null;
  const s = c.getSolarCalendar();
  return new Date(s.year, s.month - 1, s.day);
}
export function lunarLabel(date: Date): string {
  const l = toLunar(date);
  return l ? `음력 ${l.intercalation ? "윤 " : ""}${l.month}.${l.day}` : "";
}
