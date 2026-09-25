# VoiceRemedy 0.3.1 — Quiet bug sweep

## Fixed
- Voice-off mode no longer skips teaching: it presents instructions and waits for "I'm ready to sing."
- Failed speech offers a written-instruction fallback before asking for microphone access.
- The start chime works in both spoken and text-guided practice; playback exceptions release the microphone and show a retryable error.
- Cancelling during suspended audio startup now stops an already acquired microphone stream.
- Late microphone permissions cannot resurrect a cancelled session, including the comfortable-note finder.
- Completed, failed, interrupted, and timed-out speech release their media and timers. Old clip events cannot cancel a new clip.
- Changing the starting note or practice pace clears feedback from the old settings.
- Backgrounding preserves completed feedback instead of replacing it with a paused lesson.

## Improved
- The selected lesson and phrase mode survive a restart.
- Song words stay visible, with the current word highlighted during demonstration and singing.
- Microphone status and time remaining are visible.
- Helper text has stronger contrast and larger type; mobile pause controls remain within reach.
- Screen readers do not announce a duplicate caption over the coach's spoken audio.
- Comfortable-note guidance matches the current controls.

## Validation
59 automated tests pass with mocked audio hardware: no speaker playback or microphone capture was used during this sweep. TypeScript and production builds pass. Windows and Android/Fire packages are rebuilt as version 0.3.1 (Android version code 4). Physical-device singing tests remain outstanding.
