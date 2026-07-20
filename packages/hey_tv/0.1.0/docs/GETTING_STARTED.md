# Getting started

```hey
import 'pkg:hey_tv@0.1.0/television'

program
  let display = Television.public_display(
    'ABCD',
    'Party game',
    [{id: 'p1', nickname: 'Ada'}],
    'lobby'
  )
  says display.kind
end
```

The value contains no private player state. Native platform packages decide how
to render it.
