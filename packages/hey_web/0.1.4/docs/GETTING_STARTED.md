# Getting started

1. Install or vendor the current compatible Hey toolchain.
2. Install the immutable `hey_web` release through `hey package install`.
3. Import `pkg:hey_web@0.1.4/main`.
4. Define controller modules and source routes.
5. Load `config/hey_web.json`, build the application, and call `HeyWeb.serve`.

## Suggested app tree

```text
app/
  controllers/
  models/
  jobs/
  views/
config/
  hey_web.json
  routes.hey
bin/
  server
```

## Testing controllers without sockets

```hey
let response = HeyWeb.dispatch(app, {
  method: 'GET',
  path: '/health',
  headers: {},
  body: ''
})

says response.status
says response.body
```

The same route callable is used by pure dispatch tests and the live server.

## EHY templates

EHY intentionally follows ERB-style delimiters:

```ehy
<h1><%= title %></h1>
<% for item in items %>
  <p><%= item.name %></p>
<% end %>
```

Use `HeyWebView.response(path, bindings, layout_path)` from a controller. `{{ value }}` is Mustache syntax, not EHY.

## Release workflow

```sh
bin/check
bin/release
unzip -tq "dist/hey_web-0.1.4.zip"
bin/source-zip
bin/publish --no-commit
```

`bin/publish` refuses to overwrite an existing version and defaults to `$HOME/dev/jayteesf.github.io/packages`.
