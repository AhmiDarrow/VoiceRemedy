import type { Lesson } from './course'
import type { NoteReview } from './coaching'

type SongLine = { notes: number[]; words: string; beats: number[] }
const songOrder=['mary','twinkle','joy','london','sleeping','row']
type TeachingSong = { id: string; title: string; skill: string; melodyOnly?: boolean; bpm?: number; lines: SongLine[] }
export const teachingSongs: TeachingSong[] = [
  { id:'row',title:'Row, Row, Row Your Boat',skill:'A lilting pulse, repeated syllables, and a gentle octave.',bpm:90,lines:[
    {notes:[0,0,0,2,4],words:'Row row row your boat',beats:[3,3,2,1,3]},
    {notes:[4,2,4,5,7],words:'gent- ly down the stream',beats:[2,1,2,1,6]},
    {notes:[12,12,12,7,7,7],words:'mer- ri- ly mer- ri- ly',beats:[1,1,1,1,1,1]},
    {notes:[4,4,4,0,0,0],words:'mer- ri- ly mer- ri- ly',beats:[1,1,1,1,1,1]},
    {notes:[7,5,4,2,0],words:'life is but a dream',beats:[2,1,2,1,6]},
  ]},
  { id:'sleeping',title:'Are You Sleeping? (Frère Jacques)',skill:'Remembering repeated phrases and returning to your starting note.',lines:[
    {notes:[0,2,4,0,0,2,4,0],words:'Are you sleep- ing are you sleep- ing',beats:[1,1,1,1,1,1,1,1]},
    {notes:[4,5,7,4,5,7],words:'Bro- ther John Bro- ther John',beats:[1,1,2,1,1,2]},
    {notes:[7,9,7,5,4,0],words:'Morn- ing bells are ring- ing',beats:[.5,.5,.5,.5,1,1]},
    {notes:[7,9,7,5,4,0],words:'morn- ing bells are ring- ing',beats:[.5,.5,.5,.5,1,1]},
    {notes:[0,-5,0,0,-5,0],words:'ding ding dong ding ding dong',beats:[1,1,2,1,1,2]},
  ]},
  { id:'london',title:'London Bridge Is Falling Down',skill:'Moving down a melody and holding a steady final note.',lines:[
    {notes:[7,9,7,5,4,5,7],words:'Lon- don Bridge is fall- ing down',beats:[1.5,.5,1,1,1,1,2]},
    {notes:[2,4,5,4,5,7],words:'fall- ing down fall- ing down',beats:[1,1,2,1,1,2]},
    {notes:[7,9,7,5,4,5,7],words:'Lon- don Bridge is fall- ing down',beats:[1.5,.5,1,1,1,1,2]},
    {notes:[2,7,4,0],words:'my fair la- dy',beats:[2,2,1,3]},
  ]},
  { id:'joy',title:'Ode to Joy · melody',melodyOnly:true,skill:'A familiar classical melody on doo: connected steps and a clear ending.',lines:[
    {notes:[4,4,5,7,7,5,4,2],words:'doo doo doo doo doo doo doo doo',beats:[1,1,1,1,1,1,1,1]},
    {notes:[0,0,2,4,4,2,2],words:'doo doo doo doo doo doo doo',beats:[1,1,1,1,1.5,.5,2]},
    {notes:[4,4,5,7,7,5,4,2],words:'doo doo doo doo doo doo doo doo',beats:[1,1,1,1,1,1,1,1]},
    {notes:[0,0,2,4,2,0,0],words:'doo doo doo doo doo doo doo',beats:[1,1,1,1,1.5,.5,2]},
  ]},
  { id:'mary', title:'Mary Had a Little Lamb', skill:'Small steps, repeated notes, and clear words.',
    lines:[
      {notes:[4,2,0,2,4,4,4],words:'Ma- ry had a lit- tle lamb',beats:[1,1,1,1,1,1,2]},
      {notes:[2,2,2,4,7,7],words:'lit- tle lamb lit- tle lamb',beats:[1,1,2,1,1,2]},
      {notes:[4,2,0,2,4,4,4,4],words:'Ma- ry had a lit- tle lamb its',beats:[1,1,1,1,1,1,1,1]},
      {notes:[2,2,4,2,0],words:'fleece was white as snow',beats:[1,1,1,1,4]},
    ] },
  { id:'twinkle', title:'Twinkle, Twinkle, Little Star', skill:'Confident leaps, descending steps, and breathing between lines.',
    lines:[
      {notes:[0,0,7,7,9,9,7],words:'Twin- kle twin- kle lit- tle star',beats:[1,1,1,1,1,1,2]},
      {notes:[5,5,4,4,2,2,0],words:'how I won- der what you are',beats:[1,1,1,1,1,1,2]},
      {notes:[7,7,5,5,4,4,2],words:'up a- bove the world so high',beats:[1,1,1,1,1,1,2]},
      {notes:[7,7,5,5,4,4,2],words:'like a dia- mond in the sky',beats:[1,1,1,1,1,1,2]},
      {notes:[0,0,7,7,9,9,7],words:'Twin- kle twin- kle lit- tle star',beats:[1,1,1,1,1,1,2]},
      {notes:[5,5,4,4,2,2,0],words:'how I won- der what you are',beats:[1,1,1,1,1,1,2]},
    ] },
].sort((a,b)=>songOrder.indexOf(a.id)-songOrder.indexOf(b.id))
// Original teaching arrangements of public-domain tunes; no third-party recordings.
export const songLessons: Lesson[] = teachingSongs.flatMap(song=>{
  const common={songId:song.id,chapter:2,coachKey:song.id,syllable:'lyrics',bpm:song.bpm??(song.lines.some(l=>l.beats.some(b=>b<1))?48:60),
    why:song.skill,listenFor:'Listen to the melody, then sing the highlighted syllables. Keep the sound easy.',
    steps:['Echo the notes on a hum, then add the displayed words.','Connect the line after the reference.','Learn each line, then choose the whole verse. Breathe at the pauses.'],
    tip:song.skill+' Hum first if words make the notes harder. Change the starting note to keep the whole melody comfortable.'}
  let total=0
  const breaks=song.lines.map(line=>{total+=line.notes.length;return total-1})
  return [
    ...song.lines.map((line,i)=>({...common,id:song.id+'-'+(i+1),title:song.title+' · line '+(i+1),label:'Line '+(i+1)+' of '+song.lines.length,minutes:'1–2 min',tag:'SONG PRACTICE',
      description:'Learn this line: '+line.words.split('- ').join('')+'.',intervals:line.notes,beats:line.beats,lyrics:line.words.split(' ')})),
    {...common,id:song.id+'-whole',wholeSong:true,coachKey:song.melodyOnly?'joywhole':'songverse',title:song.title+(song.melodyOnly?' · whole theme':' · whole verse'),label:'Put the lines together',minutes:'2 min',tag:'WHOLE VERSE',
      description:song.melodyOnly?'Sing the opening theme on doo with breathing spaces between lines.':'Sing the complete first verse with breathing spaces between lines.',intervals:song.lines.flatMap(l=>l.notes),beats:song.lines.flatMap(l=>l.beats),lyrics:song.lines.flatMap(l=>l.words.split(' ')),phraseBreaks:breaks},
  ]
})

// Return to the line needing the most help, rather than repeating a long verse.
export function songLineToReview(songId: string, notes: NoteReview[]): Lesson {
  const lines=songLessons.filter(l=>l.songId===songId&&!l.wholeSong)
  let offset=0,best=lines[0],lowest=Infinity
  for(const line of lines){
    const end=offset+line.intervals.length
    const measured=notes.filter(n=>n.step>=offset&&n.step<end)
    const score=measured.reduce((sum,n)=>sum+(n.accuracy??0),0)/line.intervals.length
    if(score<lowest){lowest=score;best=line}
    offset=end
  }
  return best
}
