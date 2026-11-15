import { chapters, lessons, type Lesson } from '../course'
import { teachingSongs } from '../songbook'
import { fill, getLocale, text } from './translate'
import type { LocaleId } from './locales'

const foundation = new Set(['match', 'hold', 'three', 'five', 'thirds', 'cool'])

function line(locale: LocaleId, key: string, vars?: Record<string, string | number>) {
  return fill(text(locale, key), vars)
}

function tokens(locale: LocaleId, key: string, fallback: readonly string[]) {
  const value = text(locale, key)
  if (value === key) return [...fallback]
  const parts = value.split(' ')
  return parts.length === fallback.length ? parts : [...fallback]
}

function courseSteps(locale: LocaleId, id: string) {
  const prefix = foundation.has(id) ? 'lesson.foundation' : `lesson.${id}`
  return [0, 1, 2].map(index => line(locale, `${prefix}.step.${index}`))
}

export function formatLesson(lesson: Lesson, locale: LocaleId): Lesson {
  if (lesson.coachKey === 'imported' || lesson.id.startsWith('import-')) {
    const label = lesson.label.startsWith('Your song · ')
      ? line(locale, 'import.label', { time: lesson.label.slice('Your song · '.length) })
      : lesson.label
    return {
      ...lesson,
      label,
      minutes: line(locale, 'import.minutes'),
      tag: line(locale, 'import.tag'),
      description: line(locale, 'import.description'),
      tip: line(locale, 'import.tip'),
      why: line(locale, 'import.why'),
      listenFor: line(locale, 'import.listenFor'),
    }
  }
  if (lesson.songId) {
    const song = teachingSongs.find(item => item.id === lesson.songId)
    if (!song) return lesson
    const title = line(locale, `song.${song.id}.title`)
    const skill = line(locale, `song.${song.id}.skill`)
    const lyrics = lesson.wholeSong
      ? song.lines.flatMap((item, index) => tokens(locale, `lyric.${song.id}.${index + 1}`, item.words.split(' ')))
      : tokens(locale, `lyric.${song.id}.${Number(lesson.id.split('-')[1])}`, lesson.lyrics ?? [])
    const readable = lyrics.join(' ').split('- ').join('')
    const wholeTitle = song.melodyOnly ? 'songbook.whole.themeTitle' : 'songbook.whole.verseTitle'
    return {
      ...lesson,
      title: lesson.wholeSong ? line(locale, wholeTitle, { title }) : line(locale, 'songbook.lineTitle', { title, n: lesson.id.split('-')[1] }),
      label: lesson.wholeSong ? line(locale, 'songbook.whole.label') : line(locale, 'songbook.lineLabel', { n: lesson.id.split('-')[1], total: song.lines.length }),
      minutes: lesson.wholeSong ? line(locale, 'songbook.whole.minutes') : line(locale, 'songbook.minutes'),
      tag: lesson.wholeSong ? line(locale, 'songbook.whole.tag') : line(locale, 'songbook.tag'),
      description: lesson.wholeSong
        ? line(locale, song.melodyOnly ? 'songbook.whole.themeDescription' : 'songbook.whole.verseDescription')
        : line(locale, 'songbook.lineDescription', { line: readable }),
      why: skill,
      listenFor: line(locale, 'songbook.listenFor'),
      steps: [0, 1, 2].map(index => line(locale, `songbook.step.${index}`)),
      tip: line(locale, 'songbook.tip', { skill }),
      lyrics,
    }
  }
  const lyrics = lesson.id === 'melody' || lesson.id === 'answer' || lesson.id === 'song'
    ? tokens(locale, `lyric.course.${lesson.id}`, lesson.lyrics ?? [])
    : lesson.lyrics
  return {
    ...lesson,
    title: line(locale, `lesson.${lesson.id}.title`),
    label: line(locale, `lesson.${lesson.id}.label`),
    minutes: line(locale, `lesson.${lesson.id}.minutes`),
    tag: line(locale, `lesson.${lesson.id}.tag`),
    description: line(locale, `lesson.${lesson.id}.description`),
    syllable: lesson.syllable === 'vowels' ? line(locale, 'syllable.vowels') : lesson.syllable,
    tip: line(locale, `lesson.${lesson.id}.tip`),
    why: line(locale, `lesson.${lesson.id}.why`),
    listenFor: line(locale, `lesson.${lesson.id}.listenFor`),
    steps: courseSteps(locale, lesson.id),
    lyrics,
  }
}

export function presentLesson(lesson: Lesson, locale: LocaleId = getLocale()): Lesson {
  return locale === 'en' ? lesson : formatLesson(lesson, locale)
}

export function presentChapter(index: number, locale: LocaleId = getLocale()) {
  const chapter = chapters[index]
  if (!chapter || locale === 'en') return chapter
  return {
    title: line(locale, `chapter.${index}.title`),
    subtitle: line(locale, `chapter.${index}.subtitle`),
    skill: line(locale, `chapter.${index}.skill`),
  }
}

export function songTitle(id: string, fallback: string, locale: LocaleId = getLocale()) {
  return locale === 'en' ? fallback : line(locale, `song.${id}.title`)
}

export function songSkill(id: string, fallback: string, locale: LocaleId = getLocale()) {
  return locale === 'en' ? fallback : line(locale, `song.${id}.skill`)
}

export function songMatches(id: string, title: string, skill: string, query: string, locale: LocaleId = getLocale()) {
  const haystack = `${title} ${skill} ${line(locale, `song.${id}.title`)} ${line(locale, `song.${id}.skill`)}`.toLowerCase()
  return haystack.includes(query.trim().toLowerCase())
}

export const courseLessons = lessons
