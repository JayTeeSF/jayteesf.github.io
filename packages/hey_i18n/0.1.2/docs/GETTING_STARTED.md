# Getting started

Lock the package, then import its one module:

```hey
import 'hey_i18n:i18n'
```

Build a catalog record (no registration call, no boot hook — the record IS
the registration), resolve a chain, and translate:

```hey
let catalog = {
  en: {app_name: 'Demo App', greeting: 'Hello {name}'},
  es: {greeting: 'Hola {name}'},
}
let chain = I18n.chain('es-MX', 'en')   # -> ['es-MX', 'es', 'en']

I18n.format(catalog, chain, 'greeting', {name: 'Ada'})   # -> 'Hola Ada'
I18n.t(catalog, chain, 'app_name')   # -> 'Demo App' (falls through es-MX, es, lands on en)
```

Count-dependent copy uses a separate plural catalog whose values are
records of CLDR category -> template:

```hey
let plural_catalog = {
  pl: {file_count: {one: '1 plik', few: '{count} pliki', many: '{count} plikow'}},
}
let chain_pl = I18n.chain('pl', 'en')
I18n.plural(plural_catalog, chain_pl, 'file_count', 5, {count: 5})   # -> '5 plikow'
```

In a `stdlib:Web` handler, negotiate the locale from the device and reuse
the same catalog for a compile-time heredoc page body:

```hey
let locale = I18n.locale_for_request(request, catalog, 'en')
let chain = I18n.chain(locale, 'en')
let html = I18n.render_body(page_html, catalog, chain, '@@', '@@')
```

Tokens in the page look like `@@app_name@@`. Pick delimiters that do not
appear in your own markup (verify with a grep over your assets) — CSS/JS
braces rule out `{name}` for page bodies.

Read `DESIGN.md` before writing catalog values: no ASCII apostrophe in any
value — use `’` (U+2019) or phrase without contractions.
