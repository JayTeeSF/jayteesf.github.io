# hey_web 0.1.2

`hey_web` is the application layer above Hey 0.99.259a's `stdlib:web`, `stdlib:http`, `stdlib:net`, `stdlib:ehy`, and Jobs runtime.

It does **not** reimplement HTTP parsing, sockets, TLS, route dispatch, or the package manager. It adds the conveniences normally supplied by tools such as curl and Puma plus a small Rails-shaped application structure:

| Rails/Ruby concept | Hey equivalent |
|---|---|
| `config/puma.rb` | `config/hey_web.json` plus `HeyWebServer` |
| `config/routes.rb` | `HeyWebRouter` route declarations in Hey source |
| controller classes | modules with request functions |
| ERB views/layouts | EHY through `HeyWebView` |
| JSON actions | `web.json`, `web.created`, and `HeyWebController.from_result` |
| Active Job | Hey `job`/`jobs.define` plus `HeyWebJobs` |
| Active Record / Sequel | sibling `hey_record`, `hey_sqlite3`, and `hey_mysql` packages |

Routes remain Hey source because handlers are first-class compiled callables. JSON configuration controls operational values such as host, port, workers, timeouts, body limits, and built-in middleware.

## curl-style client

```sh
bin/hey-web https://example.com/
bin/hey-web -H 'accept: application/json' https://example.com/items
bin/hey-web --json '{"name":"Ada"}' https://example.com/items
bin/hey-web -X PATCH --json '{"name":"Grace"}' https://example.com/items/1
bin/hey-web -o artifact.zip https://example.com/artifact.zip
```

The client delegates URL parsing, HTTP/HTTPS, redirects, TLS validation, bounded reads, and byte-preserving downloads to `stdlib:http`. It adds CLI parsing, JSON bodies, status checking, presentation, and output-file behavior.

## Puma-style application server

```hey
import 'pkg:hey_web@0.1.2/main'
import 'stdlib:web'
import 'stdlib:cli'

module HealthController
  fn show(request)
    return web.json({ok: true, service: 'cards'})
  end
end

program
  let config = HeyWebServer.options(cli.args(), HeyWebConfig.load_or_default('config/hey_web.json'))
  let routes = [web.get('/health', HealthController.show)]
  let app = HeyWeb.application('cards', routes, config)
  says HeyWebServer.banner(app)
  let running = HeyWeb.serve(app)
end
```

`workers: 0` preserves Hey's automatic online-CPU worker selection. Slow, retryable, or durable work belongs in Jobs rather than request workers.

## Resource controllers

```hey
let users_controller = {
  index: UsersController.index,
  show: UsersController.show,
  create: UsersController.create,
  update: UsersController.update,
  destroy: UsersController.destroy
}

let routes = HeyWebRouter.resources('/users', users_controller)
```

This emits index, show, create, PATCH update, PUT update, and delete routes.

## EHY views

```hey
module PagesController
  fn index(request)
    return HeyWebView.response(
      'views/pages/index.ehy',
      {title: 'Hey Web'},
      'views/layouts/application.ehy'
    )
  end
end
```

## Verify and package

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" ./bin/check
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" OUT_DIR="$HOME/Downloads" ./bin/package-zip
./bin/reproduce-prompt
```

See `docs/GETTING_STARTED.md`, `docs/ARCHITECTURE.md`, and `docs/ROADMAP.md`.

## Live localhost receipt

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" ./bin/check-live-http
```

This starts a one-request `stdlib:web` server and fetches its JSON endpoint through the `hey-web` client. Set `HEY_WEB_TEST_PORT` when port 39091 is unavailable.

### EHY syntax

EHY is Hey's ERB-style template format. Interpolate with `<%= expression %>`, execute control-flow statements with `<% ... %>`, and write template comments with `<%# ... %>`.

```ehy
<section>
  <h1><%= title %></h1>
  <% if signed_in %>
    <p>Welcome back, <%= name %>.</p>
  <% end %>
</section>
```

Mustache-style `{{ title }}` is not EHY and should not be used in `.ehy` files.
