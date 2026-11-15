import { useState } from 'react'
import { teachingSongs, songLessons } from './songbook'
import type { Lesson } from './course'
import type { Result } from './pitch'
import { MIN_SAMPLES } from './coaching'
import { presentLesson, songMatches, songSkill, songTitle } from './i18n/content'
import { formatInteger, pluralCategory } from './i18n/translate'
import { useI18n } from './i18n/useI18n'

export function Songbook({history,onChoose,onClose}:{history:Result[];onChoose:(lesson:Lesson)=>void;onClose:()=>void}) {
  const { t } = useI18n()
  const [query,setQuery]=useState('')
  const matches=teachingSongs.filter(s=>songMatches(s.id,s.title,s.skill,query))
  const practised=new Set(history.filter(r=>r.samples>=MIN_SAMPLES).map(r=>r.exercise))
  return <section className="song-import" aria-label={t('songbook.aria')}>
    <div className="import-heading"><h2>{t('songbook.title')}</h2><button className="coach-secondary" onClick={onClose}>{t('songbook.close')}</button></div>
    <p>{t('songbook.lead')}</p>
    <label>{t('songbook.find')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('songbook.placeholder')}/></label>
    <p role="status" className="import-hint">{t('songbook.count.'+pluralCategory(matches.length),{count:formatInteger(matches.length)})}</p>
    {matches.map(song=>{
      const entries=songLessons.filter(l=>l.songId===song.id),lines=entries.filter(l=>!l.wholeSong)
      const count=lines.filter(l=>practised.has(l.id)).length
      const next=lines.find(l=>!practised.has(l.id))??entries[entries.length-1]
      const title=songTitle(song.id,song.title)
      return <article className="songbook-entry" key={song.id}>
        <h3>{title}</h3><p>{songSkill(song.id,song.skill)}</p>
        <p className="import-hint">{t('songbook.progress',{count:formatInteger(count),total:formatInteger(lines.length)})} · {practised.has(entries[entries.length-1].id)?t('songbook.wholeTried'):t('songbook.wholeReady')}</p>
        <button className="coach-primary" onClick={()=>onChoose(next)}>{count?t('songbook.continue',{title}):t('songbook.start',{title})}</button>
        <div className="import-actions">{entries.map(l=>{const view=presentLesson(l);return <button className="coach-secondary" key={l.id} aria-label={title+' · '+view.label} onClick={()=>onChoose(l)}>{l.wholeSong?(song.melodyOnly?t('songbook.theme'):t('songbook.verse')):view.label}{practised.has(l.id)&&<span aria-label={t('songbook.previously')}> ✓</span>}</button>})}</div>
      </article>
    })}
    {!matches.length&&<p>{t('songbook.empty')}<button className="coach-secondary" onClick={()=>setQuery('')}>{t('songbook.showAll')}</button>.</p>}
    <p className="import-hint">{t('songbook.footer')}</p>
  </section>
}
