import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { visibleDDaysState } from '../../store/atoms';
import { differenceInCalendarDays } from 'date-fns';
import { MdSettings, MdOpenInNew } from 'react-icons/md';
import DDayModal from './DDayModal';
import { openWidget } from '../Widgets/WorkspaceControls';
import styles from './DDayWidget.module.scss';

export default function DDayWidget() {
  const days = useRecoilValue(visibleDDaysState);
  const [showModal, setShowModal] = useState(false); const [today, setToday] = useState(new Date());
  useEffect(() => { const interval = setInterval(() => setToday(new Date()), 30000); return () => clearInterval(interval); }, []);
  return <><div className={styles.ddayWidget}><div className={styles.ddayContent}>
    <div className={styles.dayRows}>{days.length ? days.map(day => { const diff = differenceInCalendarDays(new Date(day.targetDate), today); return <div key={day.id} className={styles.dayRow}><span className={styles.ddayBadge}>{diff === 0 ? 'D-DAY' : diff > 0 ? `D-${diff}` : `D+${-diff}`}</span><span className={styles.ddayTitle}>{day.title}</span><button className={styles.settingsButton} title="이 디데이를 위젯으로 열기" aria-label={`${day.title} 위젯 열기`} onClick={() => openWidget('dday',day.id)}><MdOpenInNew /></button></div>; }) : <span className={styles.addText}>기억하고 싶은 날을 추가하세요</span>}</div>
    <button className={styles.settingsButton} title="D-DAY 관리" aria-label="D-DAY 관리" onClick={() => setShowModal(true)}><MdSettings /></button>
  </div></div>{showModal && <DDayModal onClose={() => setShowModal(false)} />}</>;
}
