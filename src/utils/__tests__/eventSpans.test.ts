import { describe,it,expect } from 'vitest';
import type {Event} from '../../types';
import {layoutEventSpans,isMultiDayEvent} from '../eventSpans';
const days=Array.from({length:7},(_,i)=>new Date(2026,9,4+i));
const event=(id:string,start:number,end?:number):Event=>({id,title:id,date:new Date(2026,9,start),endDate:end?new Date(2026,9,end):undefined,color:'#888888'});
describe('connected date spans',()=>{
 it('makes one inclusive bar for October 5–9 and excludes single days',()=>{
   expect(layoutEventSpans([event('range',5,9),event('single',5,5)],days)).toEqual([expect.objectContaining({start:1,end:5,lane:0,continuesBefore:false,continuesAfter:false})]);
   expect(isMultiDayEvent(event('single',5))).toBe(false);
 });
 it('clips at week and month boundaries and shows continuation',()=>{
   expect(layoutEventSpans([event('range',1,15)],days)[0]).toMatchObject({start:0,end:6,continuesBefore:true,continuesAfter:true});
   expect(layoutEventSpans([event('past',1,3),event('future',12,15)],days)).toEqual([]);
 });
 it('keeps overlapping bars in different lanes and reuses free lanes',()=>{
   const spans=layoutEventSpans([event('long',4,8),event('overlap',5,6),event('later',9,10)],days);
   expect(spans.map(s=>s.lane)).toEqual([0,1,0]);
 });
});
