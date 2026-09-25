import { startingBounds } from './song'
import type { SingingResult } from './coaching'

export const octaveNumber=(midi:number)=>Math.floor(Math.round(midi)/12)-1
export function placeStartingNote(heard:number,intervals:readonly number[]) {
  const bounds=startingBounds(intervals),desired=heard-intervals[0]
  const base=Math.max(bounds.min,Math.min(bounds.max,desired))
  return {base,first:base+intervals[0],exact:base===desired}
}
// Require agreement across measured notes; a single harmonic jump is not enough.
export function octaveAdjustment(result:SingingResult,intervals:readonly number[]):number|null {
  if(result.samples<20||result.coverage<.6||(result.participation??0)<.45)return null
  const notes=result.notes.filter(n=>n.samples>=4&&n.offset!==null)
  const total=notes.reduce((n,v)=>n+v.samples,0)
  if(!total)return null
  const bounds=startingBounds(intervals)
  for(const shift of [-12,12]){
    const aligned=notes.filter(n=>Math.abs(n.offset!-shift*100)<=100).reduce((n,v)=>n+v.samples,0)
    if(aligned/total>=.8&&result.base+shift>=bounds.min&&result.base+shift<=bounds.max)return result.base+shift
  }
  return null
}
