# Roadmap

## 0.1.0 — extracted from hey_ios

- The CarPlay audio scene as an `hey_ios` 0.2.0 extension (`ios-extension.json`), reading the host's audio feed through public hooks.
- `carplay.hey` contract and `row_playable?`, held in agreement with the extension manifest.
- `hey_packager >=0.1.3` controls.

## Next

- A CarPlay Simulator frame and a device receipt once Apple grants the entitlement.
- Tabs for feeds with more than one list.

## 0.1.1 — on hey_ios 0.3.0

- The same scene, depending on `hey_ios` 0.3.0 (served descriptions, renderer level 2). An app holds one `hey_ios` version, so the CarPlay extension moves with it.

## 0.1.2 — on any hey_ios 0.3.x

- The same scene, depending on `hey_ios` ^0.3.0, so an app that takes a hey_ios 0.3 fix (0.3.1: signing in no longer crashes on a phone) keeps its CarPlay extension without a new release here.

## 0.1.3 — package controls

- Adopts hey_packager (canonical bin/check, bin/bump, bin/release, bin/publish); release no longer publishes.
