# Roadmap

- 64-bit sets (`roaring64`) when a consumer needs IDs beyond 2^32.
- Iteration without materializing pages, and in-place union/intersection, if profiling shows the page copies matter.
- A native-Hey implementation once the LLVM lane supports bitwise operators and popcount; keep this wrapper as the conformance reference.
