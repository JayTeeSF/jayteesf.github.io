# Roadmap

1. Migrate the VSS iOS client and blind server to import the package directly.
2. Add byte-identical consumer fixtures in both repositories.
3. Add explicit protocol migration adapters only when a deployed older protocol
   requires them; do not silently revive `vss-sync-2`.
4. Reuse the same pure package from the future Android and local-desktop/web
   clients.
5. Keep HTTP, persistence, authentication registries, secure storage, and UI in
   separate packages or applications unless multiple unrelated consumers prove a
   generic Hey abstraction.
