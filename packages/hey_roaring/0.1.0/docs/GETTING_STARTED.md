# Getting started

Build the native extension with `bin/build-native`; it prints the library path. Then:

```hey
import 'pkg:hey_roaring@0.1.0/main'
program
 let extension = Roaring.load(library_path).value
 let cards = Roaring.create(extension).value
 let added = Roaring.add_many(cards, [3, 7, 4096, 70000])
 let present = Roaring.contains(cards, 4096)
 let optimized = Roaring.optimize(cards)
 let bytes = Roaring.serialize(cards, 1048576)
 let freed = Roaring.free(cards)
end
```

Values are unsigned 32-bit integers. `add_many` sends values in batches of `Roaring.batch_size()` (4096). `values(bitmap, offset, limit)` pages ascending values; `limit` is at most 1,048,576. `serialize(bitmap, max_bytes)` writes the portable Roaring format, which CRoaring, Java and Go read; `deserialize(extension, bytes)` accepts only a complete, valid bitmap. Free every bitmap you create, including union and intersection results.
