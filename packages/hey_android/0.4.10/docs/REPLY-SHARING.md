# Saved form sharing

A form can offer sharing after a successful request and repeat that sharing without repeating the write:

```json
{"on_success":{"share":"share_presentation","share_retry_title":"Share saved message","message":"Saved","then":"stay"}}
```

`share` selects the response field containing a URL or a presentation with `url`, `title`, `text` and `image_url`. A legacy URL selection may be enriched by `share_presentation` only when its URL matches the selected URL. Exact message text is preserved; the native share payload appends the selected link.

`share_retry_title` is optional. When present with `share`, the form copies its successful response and submitted field snapshot. Pressing the unchanged primary button shares that exact retained response without POST or GET. Editing restores normal submit behavior. Cancelling the chooser preserves the retained result; leaving the form, changing session or destroying the host clears it. Forms without this option keep ordinary submit behavior. Success navigation runs before selecting the presentation host; later user navigation invalidates pending presentation.

Artwork preparation uses a separate worker and a two-second whole-transfer deadline that disconnects an active request even while bytes keep arriving. Compressed input is capped at 4 MiB by declared and streamed size. Bounds-only decoding rejects sources over 64 MP and samples the decoded output to at most 1,048,576 pixels with a maximum 2048-pixel side. A four-entry share cache bounds retained artwork. Session changes clear shared and borrowed image caches; generation guards reject stale writes and callbacks.

While preparation is pending, the host shows a pending state. If artwork is unavailable at the deadline, the chooser receives exact text and link and the host explains the missing image. A later retry can attach available artwork. Late completion cannot open a second chooser. Attachments use a private read-only ContentProvider URI, ClipData and temporary read grants.

Run `bash specs/api_renderer_reply_share_spec.sh` to exercise the real form, HTTP save, success handling and chooser pipeline. Synthetic loopback fixtures cover occupied thumbnail workers, unchanged-primary retry, success navigation, timeout/fallback/retry, editing, leave/sign-out, slow-drip transfers, byte/pixel limits and same-URL account isolation. `HEY_ANDROID_REPLY_SCENARIO` selects cases, `HEY_ANDROID_REPLY_SDK_ROOT` selects an alternate SDK source for regression comparison, and `HEY_ANDROID_REPLY_EVIDENCE` retains logs. The renderer host rules and mutation controls check copied inputs/responses and optional behavior. Run the full package gate before release.
