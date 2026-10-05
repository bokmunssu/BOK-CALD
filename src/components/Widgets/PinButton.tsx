import { useEffect, useState } from 'react';
import { MdPushPin } from 'react-icons/md';
import toast from 'react-hot-toast';
import styles from './Widgets.module.scss';
export default function PinButton() {
  const [pinned, setPinned] = useState(false);
  useEffect(() => { window.electronAPI?.getPinned?.().then(setPinned).catch(() => {}); }, []);
  return <button className={`${styles.iconButton} ${pinned ? styles.selectedIcon : ''}`} title={pinned ? '맨 위 고정 해제' : '맨 위 고정'} aria-label="맨 위 고정" aria-pressed={pinned} onClick={async () => {
    try { setPinned(await window.electronAPI.setPinned(!pinned)); } catch { toast.error('창 고정에 실패했습니다.'); }
  }}><MdPushPin size={16} /></button>;
}
