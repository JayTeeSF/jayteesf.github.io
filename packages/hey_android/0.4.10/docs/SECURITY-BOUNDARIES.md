# Android renderer security boundaries

Media credentials are scoped by parsed scheme, host and effective port. Userinfo and origin-prefix lookalikes are refused. External media receives no session headers. Credentialed media uses bounded HTTP range reads, with every redirect response refused. Protected media must provide a known length and support byte ranges for seeking; the renderer does not cache complete media files.

`HeyAndroidPlayback.changeSession` discards playback without reporting an old track under a new identity, invalidates pending HTTP replies, clears the car feed and cancels outstanding browse/play continuations. The service publishes empty metadata and invalidates its browse root. Activity persistence and expiry use this boundary; Activity and service unregister their stable watchers on destruction.

`HeyAndroidDescription` loads only the bundled definition. Startup, resume and content refresh never fetch or select replacement UI. Legacy downloaded definitions and a `served` key cannot replace bundled screens or actions.

`specs/android_media_origin_spec.sh` checks parsed origins, redirect refusal and authenticated ranges. `specs/android_boundaries_spec.sh` checks production boundary classes with deterministic doubles and mutation controls. `specs/android_boundary_device_spec.sh` checks real HTTP ranges, native playback, car metadata and account changes with synthetic fixtures, then shuts down its emulator. `specs/api_renderer_emulator_spec.sh` checks bundled launch/resume/offline behavior, legacy cache isolation and existing content/actions. Run the full package gate before release.
