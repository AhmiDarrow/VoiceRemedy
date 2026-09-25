# VoiceRemedy 0.4.0 — Learn your own song

Added an offline audio-file import flow: local file selection, short-section preview, melody estimation on a worker, editable notes, optional syllables, and a coach lesson built from the reviewed melody. Saved sections remain available after restarting; the original source audio is held only in memory.

## Bugs and polish
- Cancelled decoding/analysis cannot replace the current section.
- Closing or hiding the importer stops original-audio playback; starting a coach session cancels pending import work.
- A late playback start cannot restart a stopped or changed section.
- Imported songs use the correct bundled spoken guidance.
- Saved imported-song IDs now survive preference validation.
- Transposition choices keep the entire estimated pattern in the pitch detector's supported range.
- Sections have time labels and can be reopened for further practice.
- Corrupt saved songs and invalid estimates are rejected.
- Limits: 15 MB, 10-minute source, 1–12 second sections, 32 notes per section, 12 saved sections.

## Verification
72 automated tests pass, including synthetic melody detection, silent input, import cancellation, persistence, and imported-song coaching. All tests used synthetic samples and mocked audio; no speaker playback or microphone capture was used. Production, Windows and Android builds are checked separately.

## Limits
Automatic analysis estimates one melodic line. It cannot separate a singer from accompaniment and may track an instrument in a full mix. The user reviews notes before teaching. Timing is simplified for practice; lyrics are not transcribed. Real recordings and physical Android/Fire file pickers, codecs, and microphones still need hands-on testing.
