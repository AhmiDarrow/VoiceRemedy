# VoiceRemedy 0.3.0 — Coach-led redesign

The main app is now a single offline voice-coaching session.

- Start my lesson speaks the instructions, then automatically begins reference playback and microphone practice.
- Spoken get-ready cues and a soft chime guide the learner's turn.
- Feedback is spoken and shown in plain language. The next-step button starts the next coached attempt directly.
- Teach me a song starts the song sequence without a lesson browser.
- Note choice and shorter turns are optional adjustments.
- Pause cancels speech, microphone requests, and active listening. Backgrounding pauses the session.
- The old dashboard, pitch graph, and score pages are removed from the entry experience.
- 48 automated tests pass, including seven new coach-flow tests.
- Spoken cue playback is explicitly excluded from pitch scoring even when it finishes late.
- Updated spoken instructions match the new interface.

This is a fully offline adaptive guided coach, as requested. It does not provide open-ended voice conversation. Physical microphone tests and learning-outcome evaluation remain outstanding.

The preview was checked for one-tap spoken teaching and pause behavior. After the user's request to keep tests in the background while watching TV, further checks used silent automated tests and builds, with no microphone capture or playback.
