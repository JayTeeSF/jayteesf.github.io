# Testing

Run the complete package gate:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"   bin/check
```

The package-specific portion is available directly as `bin/package-check`. The outer `bin/check` also validates `hey-package.json`, `VERSION`, every declared file, required documentation, and the executable documentation example.

`bin/check-reply-share` exercises the actual form save and system share sheet in a synthetic UIKit app. It loads the same `UIActivityItemsConfiguration` image/text/URL providers that external targets consume. Cases cover held and failed artwork, a byte-dripping response and absolute deadline, compressed/pixel limits, malformed bytes, safe downsampling, exact saved-result retries with no duplicate request, edits, leave/session cleanup, pending old-account responses and missing share values. Two source mutations must fail. No real account or private message is used; transport and Keychain are replaced only in the harness. `HEY_IOS_SHARE_CASE` selects a case, and `HEY_IOS_SHARE_KEEP=1` retains the temporary app/logs for inspection.

`bin/check-baked-ui` compiles the actual Foundation selector and executes the real app/scene lifecycle and UIKit list in a synthetic simulator app. A valid matching legacy cache and legacy `served` route remain in its fixture. The gate checks bundled UI at cold startup, foreground, manual content refresh and offline startup/resume; content/session requests stay authenticated and badge refresh still works. A custom URL protocol supplies all answers or an offline error without real network traffic; the test session replaces Keychain access. Stored-override and restored-startup-fetch mutations must fail. `--selection-only` runs just the Foundation cases and mutation control. The full gate honors `HEY_IOS_SIM_UDID` and shuts down only a simulator it booted.

`bin/package-check` runs `bin/conformance` (hey_mobile's vectors against the native evaluator on this Mac) and `bin/block-lifetimes`, which builds the host for the iOS Simulator with AddressSanitizer and runs the form's submit chain and the list's reorder chain against a stubbed request with `simctl spawn`. Each chain has a negative control: its fix reverted must stop with a heap-use-after-free. It boots an iPhone simulator when none is booted (`HEY_IOS_SIM_UDID` picks one) and shuts down any simulator it booted.

## Release verification

`bin/check-header-image-link` syntax-compiles the host and executes its real header on an iPhone simulator. It checks HTTP and HTTPS destinations, missing/empty/null bindings, unsafe schemes, malformed and relative URLs, missing artwork, accessible link semantics, and title/body isolation. The browser launch is intercepted so the expected canonical URL is observed without opening a network connection. Deliberate binding, validation, destination, and accessibility mutations must each fail. Like `bin/block-lifetimes`, it honors `HEY_IOS_SIM_UDID` and shuts down only a simulator it booted.

```sh
bin/release
unzip -tq "dist/hey_ios-0.4.16.zip"
unzip -tq "dist/hey_ios-registry-publication-0.4.16.zip"
cat dist/SHA256SUMS.txt
```

Package release metadata is processed by compiled Hey through hey_packager >= 0.1.11; Python is not required.
