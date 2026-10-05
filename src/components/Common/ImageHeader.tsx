import { useState, useRef, useEffect } from 'react';
import { FiMove, FiTrash2 } from 'react-icons/fi';
import { imageTransform, type ImagePlacement } from '../../utils/banner';
import BannerPositionEditor from './BannerPositionEditor';
import styles from '../Widgets/Widgets.module.scss';
export default function ImageHeader({ image, placement, label, onChange, onRemove }: {
  image: string; placement: ImagePlacement; label: string;
  onChange: (value: ImagePlacement) => void; onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => { const observer = new ResizeObserver(([entry]) => { if (entry.contentRect.height > 0) setRatio(entry.contentRect.width / entry.contentRect.height); }); if (container.current) observer.observe(container.current); return () => observer.disconnect(); }, []);
  const [ratio, setRatio] = useState(3);
  return <><div className={styles.imageHeader} ref={container}>
    <img src={image} alt={`${label} 이미지`} style={imageTransform(placement)} />
    <div className={styles.imageActions}><button className={styles.iconButton} aria-label={`${label} 이미지 표시 조정`} title="표시 위치 · 확대/축소" onClick={() => setEditing(true)}><FiMove /></button><button className={styles.iconButton} aria-label={`${label} 이미지 삭제`} onClick={onRemove}><FiTrash2 /></button></div>
  </div>{editing && <BannerPositionEditor image={image} x={placement.positionX} y={placement.positionY} zoom={placement.zoom} ratio={ratio} onSave={p => { onChange({ positionX: p.x, positionY: p.y, zoom: p.zoom }); setEditing(false); }} onClose={() => setEditing(false)} />}</>;
}
