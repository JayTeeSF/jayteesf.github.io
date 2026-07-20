# Getting started

After locking the package:

```sh
hey party init \
  --out "$HOME/dev/my_party_app" \
  --name my_party_app \
  --base-url https://party.example
```

The generated application uses `hey_web 0.1.6`, `hey_mobile 0.1.3`, and
`hey_tv 0.1.0`. Add `hey_ios_tv` and/or `hey_android_tv` in the consuming app;
those native adapters are intentionally not dependencies of `hey_party`.
