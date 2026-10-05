import { expect, it } from 'vitest';
import { moveBanner, clampPosition, clampZoom, imageTransform } from '../banner';
it('moves only the overflowing axis without cropping the original', () => {
  expect(moveBanner({x:50,y:50}, {x:20,y:-40}, {x:0,y:200})).toEqual({x:50,y:70});
  expect(moveBanner({x:50,y:50}, {x:500,y:500}, {x:100,y:100})).toEqual({x:0,y:0});
  expect(clampPosition(NaN)).toBe(50);
});
it('restores old images and constrains zoom without modifying the source', () => {
  expect(imageTransform({}).transform).toBe('scale(1)');
  expect(imageTransform({positionX:15,positionY:80,zoom:2})).toEqual({ objectPosition:'15% 80%',transform:'scale(2)',transformOrigin:'15% 80%' });
  expect(clampZoom(0)).toBe(.5);
  expect(clampZoom(100)).toBe(3);
  expect(clampZoom(NaN)).toBe(1);
});
