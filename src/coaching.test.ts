import { describe, expect, it } from 'vitest'
import { assessment, canMeasure, comfortableNote, makePlan, phaseAt, reviewNotes, comparablePrevious, singingSummary, type SingingResult } from './coaching'
import { lessons, readyForNext, recommendedLesson } from './course'
const good: SingingResult = { id:'a', date:'2026-09-24T12:00:00Z', exercise:'match', seconds:30, samples:90, accuracy:90, offset:0, steadiness:10, low:60, high:60, base:60, mode:'echo', gentle:false, notes:[{step:0,midi:60,samples:90,accuracy:90,offset:0}], coverage:1, voicedSeconds:8.1, participation:.8 }
describe('a coach who takes turns', () => {
  it('never grades its own reference or the decay afterward', () => {
    const plan = makePlan([0],60,'echo',false)
    for (const time of [0,2,2.3,2.89,3,3.54,3.6,3.79]) expect(canMeasure(phaseAt(plan,time),time)).toBe(false)
    expect(canMeasure(phaseAt(plan,3.81),3.81)).toBe(true)
    expect(canMeasure(phaseAt(plan,6.6),6.6)).toBe(false)
  })
  it('creates a contiguous finite plan for every lesson and pace', () => {
    for (const lesson of lessons) for (const mode of ['echo','phrase'] as const) for (const gentle of [false,true]) {
      const plan = makePlan(lesson.intervals,60,mode,gentle,lesson)
      expect(plan[0].start).toBe(0)
      plan.forEach((phase,i) => { expect(phase.end).toBeGreaterThan(phase.start); if(i) expect(phase.start).toBe(plan[i-1].end); expect(Number.isFinite(phase.midi)).toBe(true) })
      expect(phaseAt(plan,plan.at(-1)!.end)).toBeNull()
      expect(plan.at(-1)!.end).toBeLessThan(lesson.wholeSong && mode==='echo'?360:150)
    }
  })
  it('makes gentle echoes shorter, with longer rests', () => {
    const ordinary = makePlan([0],60,'echo',false), gentle = makePlan([0],60,'echo',true)
    const duration = (p: typeof ordinary, kind: string) => { const s = p.find(x => x.kind === kind)!; return s.end-s.start }
    expect(duration(gentle,'sing')).toBeLessThan(duration(ordinary,'sing'))
    expect(duration(gentle,'rest')).toBeGreaterThan(duration(ordinary,'rest'))
  })
  it('preserves song rhythms and includes breaths between all four lines', () => {
    const song = lessons.find(l=>l.id==='song')!
    const plan = makePlan(song.intervals,60,'phrase',false,song)
    const listen = plan.filter(p=>p.kind==='listen'), sing = plan.filter(p=>p.kind==='sing')
    expect(sing.length).toBe(16); expect(listen.length).toBe(16)
    expect(sing[3].end-sing[3].start).toBeCloseTo(2*(sing[0].end-sing[0].start))
    expect(sing[4].start-sing[3].end).toBeCloseTo(1.5)
    expect(sing[8].start-sing[7].end).toBeCloseTo(1.5)
  })
})
describe('useful, honest recommendations', () => {
  it('does not call an unheard pattern a success', () => { expect(assessment({...good,coverage:.2}).key).toBe('coverage'); expect(assessment({...good,samples:19}).key).toBe('no-signal') })
  it('does not award a milestone for brief correct sounds in an otherwise silent practice', () => {
    const brief = {...good,participation:.12}
    expect(assessment(brief).key).toBe('coverage')
    expect(readyForNext('match',[brief,{...brief,id:'b'}])).toBe(false)
  })
  it('does not tell singers to push an octave higher', () => { expect(assessment({...good,accuracy:0,offset:-1200}).key).toBe('octave') })
  it('uses robust pitch direction instead of one giant outlier', () => { expect(singingSummary([...Array(30).fill(-50),1200],Array(31).fill(60)).offset).toBe(-50) })
  it('marks notes with too little clear singing as unknown', () => { expect(reviewNotes([0,2],60,[{step:0,cents:0}])[0].accuracy).toBeNull(); expect(reviewNotes([0,2],60,Array(10).fill({step:0,cents:0}))[1].accuracy).toBeNull() })
  it('needs repeated evidence before recommending progression', () => {
    expect(readyForNext('match',[good])).toBe(false)
    expect(readyForNext('match',[good,{...good,id:'b'}])).toBe(true)
    expect(recommendedLesson([good,{...good,id:'b'}]).id).toBe('hold')
    expect(readyForNext('song',[{...good,exercise:'song'},{...good,id:'b',exercise:'song'}])).toBe(false)
  })
  it('compares only sessions with the same exercise, pitch, mode and pace', () => {
    expect(comparablePrevious(good,[{...good,id:'b',base:62}])).toBeUndefined()
    expect(comparablePrevious(good,[{...good,id:'b',mode:'phrase'}])).toBeUndefined()
    expect(comparablePrevious(good,[{...good,id:'b',gentle:true}])).toBeUndefined()
    expect(comparablePrevious(good,[{...good,id:'b'}])?.id).toBe('b')
  })
})
describe('comfortable starting point', () => {
  it('requires enough stable singing rather than guessing', () => {
    expect(comfortableNote(Array(19).fill(60))).toBeNull()
    expect(comfortableNote(Array.from({length:30},(_,i)=>55+i*.2))).toBeNull()
    expect(comfortableNote(Array(25).fill(60.2))).toBe(60)
    expect(comfortableNote(Array(25).fill(80))).toBe(80)
    expect(comfortableNote(Array(25).fill(84))).toBeNull()
  })
})
