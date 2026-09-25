# VoiceRemedy 0.2.0 — 2026-09-24

This release changes VoiceRemedy from a small set of pitch exercises into a guided beginner course.

## Learning

- Twelve lessons, grouped into four chapters, lead from a first hum to an original song.
- New pulse, vowel, connected-singing, and lyric lessons explain both the purpose of practice and what to listen for.
- An unscored breathing warm-up and a microphone-based comfortable-note finder help learners begin gently.
- Echo and Phrase modes separate learning individual notes from connecting a melody. Reference playback follows song durations and phrase breaks.
- A beginner practice guide explains note names, repeating exercises, interpreting feedback, and practicing away from the display.

## Feedback and reliability

- Reference playback and singing now take separate turns. Reference notes, decay, rests, and note-onset settling are excluded from the score.
- Note-by-note review offers replay, measured pitch direction, and practical follow-up suggestions.
- Practice milestones require repeated results and substantial participation, rather than a short correct sound or silence. The whole-song milestone requires Phrase mode.
- Comparisons use equivalent practice conditions. Preferences persist locally.
- Microphone cancellation, app backgrounding, disconnection, duplicate callbacks, and interrupted audio timing are handled explicitly.
- Older tablet JavaScript compatibility, responsive controls, keyboard navigation, and reduced-motion behavior have been considered.

## Verification

41 automated tests and the TypeScript/Vite production build pass. Windows NSIS and Android debug APK builds succeed. The APK signature, version, permissions, minimum API 24, current JavaScript bundle, and 21 offline coach clips were checked. Browser layouts were reviewed at desktop, 390×844 phone, and 960×600 tablet sizes.

## Remaining real-world evaluation

No physical Fire/Android microphone or human singing test has been completed. Pitch accuracy, reference bleed in reverberant rooms, subjective coach voice quality, and lesson pacing need evaluation with real adult and child learners. The course does not claim validated teaching outcomes. Rhythm, vowel quality, expression, and vocal health are not automatically assessed. History remains shared on each installation.
