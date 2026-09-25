# VoiceRemedy 0.4.1

Song practice is easier to navigate: Previous/Next section buttons, section timestamps, preserved preferred section length at the end of a song, a word/syllable count, and Clear song to release the temporary recording without deleting saved lessons.

Fixed analysis results arriving after timeout, worker cleanup after transfer failures, stalled file decoding, preview races during rapid tapping, and old lyrics surviving a new melody analysis. Preview failures now return the controls to a usable state.

Validation: 77 automated tests passed with synthetic audio and silent test doubles. Production TypeScript/Vite, Windows installer, and Android/Fire APK builds passed. Tests never captured the microphone or played audio. Physical-device audio/file-picker checks and human singing evaluation remain outstanding.

The coach remains fully offline. Song analysis estimates a single melody, may follow instruments in a full mix, and requires note review. The Windows installer is unsigned; the APK is debug-signed for personal sideloading.
