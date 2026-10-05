import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { clampPosition, moveBanner } from '../../utils/banner';
import styles from '../Widgets/Widgets.module.scss';
export default function BannerPositionEditor({ image, x = 50, y = 50, ratio = 6, onSave, onClose }: {
  image: string; x?: number; y?: number; ratio?: number; onSave: (p: { x: number; y: number }) => void; onClose: () => void;
}) {
  const [position, setPosition] = useState({ x: clampPosition(x), y: clampPosition(y) });
  const [size, setSize] = useState({ width: 0, height: 0 }); const preview = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; position: typeof position; overflow: {x: number; y: number} } | null>(null);
  useEffect(() => { const img = new Image(); img.onload = () => setSize({ width: img.width, height: img.height }); img.src = image; const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', esc); return () => { img.onload = null; window.removeEventListener('keydown', esc); }; }, [image]);
  return createPortal(<div className={styles.modalBackdrop} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className={styles.windowPanel} role="dialog" aria-modal="true" aria-label="배너 표시 위치">
    <header className={styles.sectionHeading}><strong>배너 표시 위치</strong><span className={styles.spacer} /><button className={styles.iconButton} aria-label="배너 위치 닫기" onClick={onClose}><FiX /></button></header>
    <div ref={preview} className={styles.bannerPositionPreview} aria-label="배너 위치 미리보기" style={{ aspectRatio: ratio, backgroundImage: 'url('+image+')', backgroundPosition: position.x+'% '+position.y+'%' }}
      onPointerDown={e => { const box = e.currentTarget.getBoundingClientRect(); const scale = Math.max(box.width / size.width, box.height / size.height); drag.current = { x: e.clientX, y: e.clientY, position, overflow: { x: size.width * scale - box.width, y: size.height * scale - box.height } }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (drag.current) setPosition(moveBanner(drag.current.position, { x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }, drag.current.overflow)); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} />
    <p className={styles.message}>이미지를 드래그해 보일 부분을 선택하세요. 원본 이미지는 자르지 않습니다.</p>
    <label className={styles.bannerSize}>가로<input aria-label="배너 가로 위치" type="range" min="0" max="100" value={position.x} onChange={e => setPosition(p => ({ ...p, x: Number(e.target.value) }))} /></label>
    <label className={styles.bannerSize}>세로<input aria-label="배너 세로 위치" type="range" min="0" max="100" value={position.y} onChange={e => setPosition(p => ({ ...p, y: Number(e.target.value) }))} /></label>
    <div className={styles.actions}><button onClick={() => setPosition({ x: 50, y: 50 })}>가운데로</button><span className={styles.spacer}/><button onClick={onClose}>취소</button><button onClick={() => onSave(position)}>위치 저장</button></div>
  </section></div>, document.body);
}
