import { describe,it,expect } from 'vitest'
import { songLessons,teachingSongs,songLineToReview } from './songbook'
import { coachText } from './lessons'
import { makePlan } from './coaching'

describe('public-domain teaching songs',()=>{
  it('includes the expanded repertoire with a spoken introduction for each song',()=>{
    expect(teachingSongs.map(s=>s.id)).toEqual(['mary','twinkle','joy','london','sleeping','row'])
    for(const song of teachingSongs)expect(coachText[song.id]).toBeTruthy()
    expect(songLessons.find(l=>l.id==='joy-whole')!.coachKey).toBe('joywhole')
  })
  it('returns to the weakest line after whole-verse practice',()=>{
    const whole=songLessons.find(l=>l.id==='twinkle-whole')!
    const measured=whole.intervals.map((_,step)=>({step,midi:60,samples:8,accuracy:step>=14&&step<21?25:95,offset:0}))
    expect(songLineToReview('twinkle',measured).id).toBe('twinkle-3')
    expect(songLineToReview('mary',[]).id).toBe('mary-1')
  })
  it('matches every lyric syllable to a pitch and a playable duration',()=>{
    expect(new Set(songLessons.map(l=>l.id)).size).toBe(songLessons.length)
    for(const lesson of songLessons){
      expect(lesson.lyrics!.length).toBe(lesson.intervals.length)
      expect(lesson.beats!.length).toBe(lesson.intervals.length)
      expect(lesson.beats!.every(b=>b>0)).toBe(true)
      expect(Math.min(...lesson.beats!)*60/lesson.bpm!).toBeGreaterThanOrEqual(.6)
      expect(Math.max(...lesson.intervals)-Math.min(...lesson.intervals)).toBeLessThanOrEqual(14)
      expect(coachText[lesson.coachKey!]).toBeTruthy()
    }
  })
  it('assembles the whole verse from the taught lines with breathing spaces',()=>{
    for(const song of teachingSongs){
      const lines=songLessons.filter(l=>l.songId===song.id&&!l.wholeSong)
      const whole=songLessons.find(l=>l.songId===song.id&&l.wholeSong)!
      expect(whole.intervals).toEqual(lines.flatMap(l=>l.intervals))
      expect(whole.lyrics).toEqual(lines.flatMap(l=>l.lyrics!))
      expect(whole.phraseBreaks!.length).toBe(lines.length)
      const plan=makePlan(whole.intervals,55,'phrase',false,whole)
      expect(plan.filter(p=>p.kind==='sing').length).toBe(whole.intervals.length)
      expect(plan[plan.length-1].end).toBeLessThan(120)
    }
  })
})
