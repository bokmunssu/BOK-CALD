export const clampPosition = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
export function moveBanner(start: { x: number; y: number }, delta: { x: number; y: number }, overflow: { x: number; y: number }) {
  return { x: overflow.x > 1 ? clampPosition(start.x - delta.x / overflow.x * 100) : start.x,
    y: overflow.y > 1 ? clampPosition(start.y - delta.y / overflow.y * 100) : start.y };
}

export interface ImagePlacement { positionX?: number; positionY?: number; zoom?: number }
export const clampZoom = (zoom = 1) => Number.isFinite(zoom) ? Math.max(0.5, Math.min(3, zoom)) : 1;
export function imageTransform(p: ImagePlacement) { return { objectPosition: `${clampPosition(p.positionX ?? 50)}% ${clampPosition(p.positionY ?? 50)}%`, transform: `scale(${clampZoom(p.zoom)})`, transformOrigin: `${clampPosition(p.positionX ?? 50)}% ${clampPosition(p.positionY ?? 50)}%` }; }
