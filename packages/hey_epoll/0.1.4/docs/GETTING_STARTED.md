# Getting started

1. Depend on the package: `"hey_epoll": "0.1.1"` in `hey-package.json`, then
   `hey package ensure --project . --update-lock`.
2. Build the native library outside the installed package:

   ```sh
   PACKAGE="$PWD/.hey/packages/hey_epoll/0.1.1"
   OUT="$PWD/.hey/native/hey_epoll/0.1.1/linux-x64"     # or linux-arm64, darwin-arm64
   HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" "$PACKAGE/bin/build-native" --out "$OUT"
   ```

   `Epoll.open` finds it there when the program runs from the project root;
   otherwise set `HEY_EPOLL_LIBRARY`.
3. Serve: see `examples/echo.hey` and the loop in the package README.
