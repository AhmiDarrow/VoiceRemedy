import { useState } from 'react'
import { teachingSongs, songLessons } from './songbook'
import type { Lesson } from './course'
import type { Result } from './pitch'
import { MIN_SAMPLES } from './coaching'

export function Songbook({history,onChoose,onClose}:{history:Result[];onChoose:(lesson:Lesson)=>void;onClose:()=>void}) {
  const [query,setQuery]=useState('')
  const matches=teachingSongs.filter(s=>(s.title+' '+s.skill).toLowerCase().includes(query.trim().toLowerCase()))
  const practised=new Set(history.filter(r=>r.samples>=MIN_SAMPLES).map(r=>r.exercise))
  return <section className="song-import" aria-label="Songbook">
    <div className="import-heading"><h2>Sing a familiar song</h2><button className="coach-secondary" onClick={onClose}>Close songbook</button></div>
    <p>Learn a short line, then connect the song. Choose any line to revisit it.</p>
    <label>Find a song<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Song name or skill"/></label>
    <p role="status" className="import-hint">{matches.length} {matches.length===1?'song':'songs'} found</p>
    {matches.map(song=>{
      const entries=songLessons.filter(l=>l.songId===song.id),lines=entries.filter(l=>!l.wholeSong)
      const count=lines.filter(l=>practised.has(l.id)).length
      const next=lines.find(l=>!practised.has(l.id))??entries[entries.length-1]
      return <article className="songbook-entry" key={song.id}>
        <h3>{song.title}</h3><p>{song.skill}</p>
        <p className="import-hint">{count} of {lines.length} lines practised · {practised.has(entries[entries.length-1].id)?'Whole version attempted':'Whole version ready when you are'}</p>
        <button className="coach-primary" onClick={()=>onChoose(next)}>{count?'Continue':'Start'} {song.title}</button>
        <div className="import-actions">{entries.map(l=><button className="coach-secondary" key={l.id} aria-label={song.title+' · '+l.label} onClick={()=>onChoose(l)}>{l.wholeSong?(song.melodyOnly?'Sing whole theme':'Sing whole verse'):l.label}{practised.has(l.id)&&<span aria-label="previously practised"> ✓</span>}</button>)}</div>
      </article>
    })}
    {!matches.length&&<p>Try another name, or <button className="coach-secondary" onClick={()=>setQuery('')}>Show all songs</button>.</p>}
    <p className="import-hint">Practice marks record attempts, not mastery. Public-domain music arranged for gentle, offline practice.</p>
  </section>
}
