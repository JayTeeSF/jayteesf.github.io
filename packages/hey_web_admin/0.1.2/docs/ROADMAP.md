# Roadmap

0.1.0 is a working scaffold with two gates taken seriously (escaping and
the authorization refusal) and an honest limits list. What 0.2.0 would
address, roughly in order of how much it hurts:

## Blocked on other packages or the trunk

- **`HeyAdmin.mount` in the compiled lane.** Blocked on the `bind()`
  degradation: a callable passed as a parameter into a module function
  and stored in a route record makes `Web.dispatch` answer nil. The
  orchestrator is fixing it; when it lands, move `mount_helper_spec`
  into `bin/check-compiled`'s COMPILABLE list and make `mount` the
  recommended form. Nothing else changes.
- **A `HeyRecordModel` source.** Blocked on `model.hey` not lowering
  (`HeyRecordModel.find` is mis-resolved as the `first` builtin). It is
  the same four operations as the store source; it cannot pass the
  compiled gate today.
- **Full percent-decoding.** Blocked on `Text.from_code_point` (or any
  ints→bytes path) landing on the trunk. Until then non-ASCII escapes
  pass through literally.
- **Real authentication.** Not this package's job, and there is no auth
  package yet. When one exists, the `authorize` seam should accept it
  directly.

## Not blocked, just not built

- Search, filtering, and sort-by-column. All three need a query
  vocabulary the source contract does not have.
- Associations — waiting on `hey_record`, which declares
  `associations: false`.
- Richer validation than required-ness. Worth doing only alongside
  whatever validation layer `hey_record` eventually grows, so the admin
  and the model do not disagree.
- CSRF tokens. Genuinely needed before anyone exposes this to a browser
  that visits other sites; deliberately not faked at 0.1.0.
- Bulk actions and soft delete.
- A `hey_i18n` bridge that resolves a catalog into the `labels` record,
  so an application does not write the glue.

## Deliberately not planned

- Theming, CSS customisation, a component system. If you are styling the
  admin you have outgrown it; generate the screens and own them.
