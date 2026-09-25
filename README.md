# VoiceRemedy 0.4.0

[Download the latest Windows and Android / Fire release](https://github.com/AhmiDarrow/VoiceRemedy/releases/latest).

The Windows installer is unsigned; the Android / Fire APK is debug-signed for personal sideloading. Installation instructions are in [INSTALL.md](INSTALL.md).

VoiceRemedy is a fully offline guided singing coach for Windows, Android, and Fire HD 10 (2021 or newer).

## How it works

Tap **Start my lesson**. A calm female voice explains the exercise, plays reference notes, cues your singing turn, listens through the microphone, and gives feedback based on measured pitch. Tap **What's next?** or **Help me with that** to start the next coached attempt directly.

The main screen is one coach session. There is no lesson dashboard or pitch graph to manage. **Teach me a song** starts the original-song sequence. **Find my comfortable note** helps choose a starting pitch. Other adjustments are inside **Adjust my session**.

The underlying twelve exercises cover pitch matching, steady sounds, patterns, vowels, pulse, connected singing, and an original song. The coach moves from separate notes to phrases. A short chime marks the singing turn; spoken cues and reference playback are excluded from scoring. **Pause session** stops speech and microphone use, including pending microphone requests.

## Privacy and limits

Everything works locally. No account, network AI service, analytics, or uploaded/recorded audio. Only numerical practice history and preferences are saved. Android automatic backup is disabled. This is adaptive guided coaching, not open-ended speech recognition or a conversational language model.

The coach measures pitch. It does not assess tone quality, vocal health, vowel quality, expression, or rhythm accuracy. Real human singing and physical Android/Fire microphones still need hands-on evaluation. Automated software tests do not establish learning outcomes.

## Install and build

See INSTALL.md. Installable files are in releases/, version 0.7.0. The Windows installer is unsigned; the APK is debug-signed for personal sideloading.

Commands: npm ci, npm run dev, npm test, npm run build, npm run desktop:build, npm run android:build.

Native builds require Rust/MSVC and JDK 21 + Android SDK 36. Android minimum API is 24. Put the SDK path in untracked android/local.properties. The Android build script uses a short Java socket temporary directory for Windows Java 21. Coach clips use the Kokoro neural female voice af_heart. Regenerate them with scripts/generate-neural-coach.py; setup is documented in its header. Scripts are in src/lessons.ts. The older generate-coach.ps1 is a legacy Zira generator and should not be used for the current voice pack.

98 tests cover pitch detection, practice timing, spoken-cue exclusion, microphone lifecycle, speech-before-listening, pause during teaching, complete feedback-to-next-lesson flow, and local persistence. The previous studio interface is retained in src/StudioLibrary.tsx only for regression tests; it is not the app entry point.


## Learn a song from an audio file

Choose **Upload a song**. Select a local audio file (up to 15 MB and 10 minutes; MP3/WAV recommended). Choose a 1–12 second section and use **Hear this section** to check it. **Find the melody** estimates a single pitch line on a background worker. Review the pitches, remove incorrect notes, or add notes manually. Optional words need one word or syllable per note.

**Teach me this melody** saves the reviewed note pattern and selects it for the coach. Start the lesson to hear the imported-song instructions, practise individual notes, receive microphone feedback, and connect them into a phrase. After a successful phrase, **What's next?** returns to the import panel for another section. The source file stays in memory while the app remains open; after restarting, select it again to extract more sections.

Up to 12 reviewed song sections are saved locally and appear under **Adjust my session → Work on**. The source recording is never uploaded or persisted by VoiceRemedy. The temporary recording is released with Clear song, on replacing the file, or closing the app.

This is approximate single-melody transcription, not vocal separation. A full commercial mix may produce the bass or another instrument instead of the singer; clean solo vocals or a hummed tune work best. Review the estimate before teaching it. Practice rhythm is simplified and slowed, not a faithful transcription of expressive timing. Lyrics are optional manual input, not automatically transcribed.

## Familiar songs and neural coaching

Teach me a song opens six public-domain songs/themes: Mary Had a Little Lamb, Twinkle Twinkle, Ode to Joy, London Bridge, Are You Sleeping, and Row Your Boat. Each offers short line lessons and a complete first verse. Successful echoes lead to connected phrases; whole verses include breath pauses. After an unsuccessful verse, Help me with that selects the line needing the most work from per-note pitch measurements.

All 34 spoken clips use a locally rendered neural female voice. The finished clips ship with the app, so narration remains offline on Windows, Android, and Fire. No speech-model download is needed on the learner's device. See SONG-AND-VOICE-CREDITS.md for provenance and generation details. Silent audio-integrity checks cannot replace a subjective listening review.

The teaching rationale, primary research references, and limitations are in TEACHING-EVIDENCE.md. Adjust my session includes Show live pitch hints; disabling it preserves the final pitch feedback while letting the learner practise without concurrent correction.

## Practice controls

Hear the melody previews reference notes without opening the microphone. A little lower / A little higher transposes the pattern by one semitone. Adjust my session lets you choose note-by-note or connected practice, and remembers your live-hint preference.

The songbook supports title/skill search and shows attempted lines from local history. Continue selects the first unpractised line, then the whole version. Marks indicate practice attempts, not a certification of skill. See SOFTWARE-REVIEW.md for the product-research rationale.

Find my note and octave guides a comfortable hum and explains the measured octave. Use the result to fit the lesson's first note. Consistent octave mismatches during practice receive spoken feedback and an optional Match my octave adjustment for the next attempt. One hum is not a vocal-range or voice-type diagnosis.
