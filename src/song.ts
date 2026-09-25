import { detectPitch, midiNumber } from './pitch'
import type { Lesson } from './course'
export type SongNote = { midi: number; start: number; duration: number }
export type SongEstimate = { notes: SongNote[]; clarity: number }
export function estimateMelody(samples: Float32Array, sampleRate: number): SongEstimate {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 96000 || samples.length / sampleRate > 12.1) throw new Error('Choose a section of up to 12 seconds.')
  const hop = Math.round(sampleRate * .04), size = 1024, frames: {midi:number|null;time:number}[]=[]
  for(let offset=0;offset+size<=samples.length;offset+=hop) {
    const pitch=detectPitch(samples.subarray(offset,offset+size),sampleRate)
    frames.push({midi:pitch.hz && pitch.clarity>=.9?Math.round(midiNumber(pitch.hz)):null,time:offset/sampleRate})
  }
  // A three-frame majority rejects isolated octave errors without bridging silence.
  const smooth=frames.map((f,i)=> {
    if(f.midi===null)return f
    const near=frames.slice(Math.max(0,i-1),i+2).map(v=>v.midi)
    return {...f,midi:near.filter(n=>n===f.midi).length>=2?f.midi:null}
  })
  const notes:SongNote[]=[]
  const run:{note:SongNote|null}={note:null}
  function flush(){if(run.note && run.note.duration>=.16)notes.push({...run.note,duration:Math.round(run.note.duration*100)/100});run.note=null}
  for(const f of smooth) {
    if(f.midi===null){flush();continue}
    if(run.note?.midi===f.midi)run.note.duration=f.time-run.note.start+.04
    else {flush();run.note={midi:f.midi,start:f.time,duration:.04}}
  }
  flush()
  return {notes,clarity:frames.length?smooth.filter(f=>f.midi!==null).length/frames.length:0}
}
export function importedLesson(title:string, notes:SongNote[], words:string, sectionStart:number): Lesson {
  if(!Number.isFinite(sectionStart)||sectionStart<0||sectionStart>600||!notes.length||notes.length>32||notes.some(n=>!Number.isInteger(n.midi)||n.midi<36||n.midi>84||!Number.isFinite(n.start)||n.start<0||!Number.isFinite(n.duration)||n.duration<.16||n.duration>12))throw new Error('Review between 1 and 32 notes, with valid pitches and lengths.')
  const lyrics=words.trim()?words.trim().split(/\s+/):undefined
  if(lyrics && lyrics.length!==notes.length)throw new Error('Use one word or syllable for each note, or leave the words blank to hum.')
  const first=notes[0].midi
  if(Math.max(...notes.map(n=>n.midi))-Math.min(...notes.map(n=>n.midi))>24)throw new Error('This estimate spans more than two octaves. Check the notes or choose a shorter, clearer section.')
  const intervals=notes.map(n=>n.midi-first), bounds=startingBounds(intervals)
  return {id:'import-'+(typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now()+'-'+Math.random()),title:title.trim().slice(0,100)||'My song',label:'Your song · '+Math.floor(sectionStart/60)+':'+String(Math.floor(sectionStart%60)).padStart(2,'0'),minutes:'Short section',tag:'YOUR SONG',chapter:2,description:'Learn this section of your song, one note at a time.',syllable:'mm',intervals,beats:notes.map(n=>Math.max(.6,n.duration/.7)),bpm:60,lyrics,phraseBreaks:notes.map((n,i)=>i<notes.length-1&&notes[i+1].start-n.start-n.duration>.25?i:-1).filter(i=>i>=0),steps:[],tip:'The melody is an estimate you reviewed. Practice timing is slowed and short notes are lengthened. Keep every note comfortable.',why:'Learn your own song in manageable sections.',listenFor:'The musical shape of the phrase, with an easy sound.',coachKey:'imported',suggestedBase:Math.max(bounds.min,Math.min(bounds.max,first))}
}
export function startingBounds(intervals:readonly number[]){return {min:Math.max(36,36-Math.min(...intervals)),max:Math.min(83,83-Math.max(...intervals))}}
export function loadSongs():Lesson[] {
  try {
    const rows:unknown=JSON.parse(localStorage.getItem('voiceremedy.songs.v1')||'[]')
    if(!Array.isArray(rows))return []
    return rows.filter((r):r is Lesson=>r && typeof r.id==='string'&&r.id.startsWith('import-')&&typeof r.title==='string'&&typeof r.description==='string'&&typeof r.tip==='string'&&typeof r.label==='string'&&r.coachKey==='imported'&&Array.isArray(r.intervals)&&r.intervals.length>0&&r.intervals.length<=32&&r.intervals.every((v:unknown)=>Number.isInteger(v)&&Math.abs(v as number)<=48)&&r.intervals[0]===0&&Math.max(...r.intervals)-Math.min(...r.intervals)<=24&&Array.isArray(r.beats)&&r.beats.length===r.intervals.length&&r.beats.every((v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=.6&&v<=18)&&r.bpm===60&&Number.isInteger(r.suggestedBase)&&r.suggestedBase>=36&&r.suggestedBase<=83&&(!r.lyrics||(Array.isArray(r.lyrics)&&r.lyrics.length===r.intervals.length&&r.lyrics.every((w:unknown)=>typeof w==='string')))&&Array.isArray(r.phraseBreaks)&&r.phraseBreaks.every((v:unknown)=>Number.isInteger(v)&&(v as number)>=0&&(v as number)<r.intervals.length)).slice(0,12)
  }catch{return []}
}
export function saveSongs(songs:Lesson[]){localStorage.setItem('voiceremedy.songs.v1',JSON.stringify(songs.slice(0,12)))}
