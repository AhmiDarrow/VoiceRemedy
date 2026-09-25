# Singing-software review and resulting changes

Reviewed 2026-09-24 using public vendor materials. This was a feature/workflow comparison, not hands-on testing of paid applications or independent verification of vendor learning claims.

- Yousician: its singing materials emphasize song-based learning, feedback, and transposing songs to suit the singer. Source: https://yousician.com/blog/online-singing-lessons
  Applied: one-tap lower/higher controls, melody preview before committing to a singing turn, and direct choice of note-by-note or connected practice.

- Sing Sharp: its features page describes progressive vocal exercises, ear training, pitch feedback, and demonstrations. Source: https://singsharp.com/en/features
  Applied: make reference listening an explicit action with the microphone off. Retain stepwise teaching and comfortable transposition. VoiceRemedy does not reproduce the vendor's claims about breath analysis or advanced vocal diagnosis.

- Riyaz: its public product page describes guided practice, song import, lesson selection, and progress tracking. Source: https://riyazapp.com/
  Applied: searchable songbook, locally saved practice marks, and a Continue button for the first unpractised line (then the whole version). Practice marks explicitly mean attempts, not mastery. Existing offline song import and weakest-line review remain available.

## Implementation and bug fixes

- Preview state participates in the existing cancellation system. Pausing, hiding the app, or changing session invalidates stale completion handlers.
- A failed audio-context startup now releases preview resources.
- Preview never asks for microphone access.
- Live-hint preference persists between visits.
- Pitch bounds disable lower/higher controls at the detector's supported limits.
- Extracted SongbookPanel.tsx; distinct basename avoids Windows/TypeScript case-insensitive module resolution collisions with songbook.ts.
- No external service, account, microphone recording upload, or new audio model is required.

## Validation

92 automated tests passed with silent audio doubles and synthetic samples. These verify software behavior, not singing effectiveness. Existing teaching evidence and limitations are documented in TEACHING-EVIDENCE.md. Subjective voice listening, visual review on physical devices, and beginner learning trials remain outstanding.

The same release also adds guided note/octave placement, spoken octave-mismatch feedback, first-note transposition, and the expanded supported starting-note bounds. Final regression count is 98 tests. These additions are described in RELEASE-NOTES-0.7.0.md and do not constitute a voice-type or full-range diagnosis.
