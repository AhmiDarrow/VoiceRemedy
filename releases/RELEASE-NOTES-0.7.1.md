VoiceRemedy 0.7.1 is a maintenance release of the offline singing coach for Windows, Android, and Fire tablets.

## Fixes
- Pitch detection now works across the full supported range on computers whose audio device runs at a high sample rate (for example 96 kHz or 192 kHz audio interfaces). Previously, lower voices could go unheard on those devices.
- Stopping a melody preview now just stops the melody. It no longer pauses the session or hides the feedback from your last round.

## Security and maintenance
- Updated the Android app runtime (Capacitor 8.6.2), which fixes a security issue that could let remote content load inside the app.
- Updated React and the build tools to current patch releases.

## Downloads
- Windows: VoiceRemedy-0.7.1-Windows-Setup.exe
- Android / Fire: VoiceRemedy-0.7.1-Android-Fire.apk
- Installation instructions: INSTALL.md
- File verification: SHA256SUMS-0.7.1.txt

The Windows installer is unsigned. The Android / Fire APK is signed with a dedicated release key for personal sideloading. It is not a Play Store or Amazon Appstore build.

The key that signed 0.7.0 is no longer available, so 0.7.1 uses a new signing key. Android and Fire refuse to install 0.7.1 over 0.7.0. Uninstall 0.7.0 once, then install 0.7.1. Uninstalling clears the on-device practice history. Later releases that keep this key install over 0.7.1 and keep that history.

The app measures pitch, not overall vocal technique or vocal health.
