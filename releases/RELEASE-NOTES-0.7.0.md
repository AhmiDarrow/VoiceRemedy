# VoiceRemedy 0.7.0

- Hear the melody before singing, with the microphone off.
- Move the melody a little lower or higher without reading note names.
- Choose note-by-note or connected practice directly.
- Search the six-song book by title or skill.
- See previously practised lines and continue to the next unpractised line.
- Remember whether live pitch hints are enabled.
- Recover cleanly from failed or cancelled melody previews.

Research: compared public Yousician, Sing Sharp, and Riyaz materials; implementation rationale is in SOFTWARE-REVIEW.md. Vendor claims are not treated as independent scientific evidence.

Validation: 92 silent automated tests, production build, and Windows/Android packaging. Android/Fire physical-device testing and subjective voice evaluation remain outstanding.

## Note and octave check (0.7.0)

Find my note and octave gives spoken instructions before opening the microphone, then listens for a five-second comfortable hum. It reports the rounded note and octave (for example C3, octave 3), explains the notation, and offers a reference preview before applying it.

Applying a note anchors the lesson's first sung note, including melodies that start above or below their key note. Starting-note choices now span the detector-supported C2–B5 region, constrained so the entire melody remains within that region. If exact placement cannot fit, the UI explains the nearest supported start instead of silently claiming a match.

After a singing round, a consistent approximately 12-semitone displacement across sufficiently sampled notes triggers spoken octave feedback and a Match my octave action. The change takes effect on the next attempt; targets do not move during scoring. Harmonic-tracking errors are possible, so the learner confirms comfort. This is not a full range assessment or classification as soprano/alto/tenor/bass.

98 automated tests now pass, including octave identification, first-note placement, weak/conflicting evidence rejection, and the complete guided-check and octave-adjustment flows.
