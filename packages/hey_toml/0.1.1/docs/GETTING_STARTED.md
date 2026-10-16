# Getting started

Install the published package with the standard package tooling, then build `bin/build-native` using a C17 compiler. Set `HEY_ROOT` if your compiler checkout is elsewhere. Native builds support Darwin arm64 and Linux x86-64. No third-party shared parser library is required: the pinned parser source is bundled with its MIT license.

```hey
import 'pkg:hey_toml@0.1.1/main'
import 'stdlib:Native'

program
 let loaded = Toml.load('/path/to/libhey_toml.dylib')
 let result = Toml.decode(loaded.value, "[server]\nport = 3307\n", Toml.limits())
 says result.value.server.port
 let closed = Native.close(loaded.value)
end
```

Use `.so` on Linux. Handle every Result in real programs; the short example assumes a successful library load. Read TOML once at startup and validate the returned values before starting a worker. Resolve credential references only after validation; keep passwords out of the file.
