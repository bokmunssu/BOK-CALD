import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './HolidayDate.module.scss';

export default function HolidayDate({holiday,children,className}: {holiday:string;children:React.ReactNode;className?:string}) {
  const [open,setOpen]=useState(false);
  const [position,setPosition]=useState({left:0,top:0,above:false});
  const anchor=useRef<HTMLButtonElement>(null), bubble=useRef<HTMLDivElement>(null);
  const id=useId();
  useLayoutEffect(()=>{
    if (!open || !anchor.current || !bubble.current) return;
    const a=anchor.current.getBoundingClientRect(), b=bubble.current.getBoundingClientRect();
    const above=a.bottom+b.height+8>=innerHeight;
    setPosition({left:Math.max(8,Math.min(a.left+a.width/2-b.width/2,innerWidth-b.width-8)),top:above?Math.max(8,a.top-b.height-6):a.bottom+6,above});
  },[open,holiday]);
  useEffect(()=>{if(!holiday)setOpen(false);},[holiday]);
  useEffect(()=>{
    if(!open)return;
    const dismiss=(e:PointerEvent)=>{if(!anchor.current?.contains(e.target as Node))setOpen(false);};
    const close=()=>setOpen(false);
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};
    document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
    window.addEventListener('resize',close);window.addEventListener('blur',close);window.addEventListener('scroll',close,true);
    return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);window.removeEventListener('resize',close);window.removeEventListener('blur',close);window.removeEventListener('scroll',close,true);};
  },[open]);
  if(!holiday)return <div className={className}>{children}</div>;
  const label = typeof children === 'number' ? `${children}일 공휴일 정보` : `${children} 공휴일 정보`;
  return <>
    <button ref={anchor} type="button" className={`${styles.dateButton} ${className || styles.inheritText}`} style={{color:'#d45d6a'}} aria-label={label} aria-describedby={open?id:undefined} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onClick={()=>setOpen(true)}>{children}</button>
    {open && createPortal(<div ref={bubble} id={id} role="tooltip" className={styles.bubble} data-above={position.above} style={{left:position.left,top:position.top}}>{holiday}</div>,document.body)}
  </>;
}
