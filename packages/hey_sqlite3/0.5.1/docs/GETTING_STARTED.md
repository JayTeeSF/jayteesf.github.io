# Getting started

Install or unzip the package source under `$HOME/dev/hey_sqlite3`, then configure Hey and the shared packager:

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
export HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"
cd "$HOME/dev/hey_sqlite3"
bin/check
```

Import the package at the exact released version shown in `VERSION` after installation through the Hey package manager.

## Serve JSON that SQLite builds (0.5.0)

A JSON endpoint does not need to turn rows into Hey objects and back into
text. Let SQLite build the body and send the text as it is. With hey_web
0.3.7, `HeyWebResponses.build(status, content_type, body)` sends a string body
unchanged:

```hey
import 'stdlib:Env'
import 'stdlib:Web'
import 'pkg:hey_sqlite3@0.5.1/adapter'
import 'pkg:hey_web@0.3.7/responses'
import 'pkg:hey_web@0.3.7/request_support'

fn database()
  return Sqlite3.connect('app.sqlite3', {library_path: Env.get('HEY_SQLITE3_LIBRARY')}).value
end

module FeedController
  # GET /feed -> [{"id":..,"body":..,"author":..}, ...], newest first
  fn index(request)
    let db = database()
    let feed = Sqlite3.query_rows_json(db, 'SELECT p.id, p.body, u.username AS author FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.id DESC LIMIT ?', [20])
    let closed = Sqlite3.close(db)
    if feed.ok == false
      return HeyWebResponses.build(500, 'application/json', '{"error":"feed unavailable"}')
    end
    return HeyWebResponses.build(200, 'application/json', feed.value)
  end

  # GET /posts/:id -> {"post":{...}} or 404
  fn show(request)
    let db = database()
    let post = Sqlite3.query_json(db, "SELECT json_object('post', json_object('id', id, 'body', body)) FROM posts WHERE id = ?", [parse_int(HeyWebRequest.param(request, 'id'))])
    let closed = Sqlite3.close(db)
    if post.ok == false
      return HeyWebResponses.build(500, 'application/json', '{"error":"post unavailable"}')
    end
    if post.value == nil
      return HeyWebResponses.build(404, 'application/json', '{"error":"not found"}')
    end
    return HeyWebResponses.build(200, 'application/json', post.value)
  end
end

program
  let routes = [Web.get('/feed', FeedController.index), Web.get('/posts/:id', FeedController.show)]
  let served = Web.serve(routes, {host: '127.0.0.1', port: 8080, workers: 4, request_timeout_ms: 15000, max_body_bytes: 1048576})
end
```

Import `adapter` (where `module Sqlite3` lives): the compiled lane wants a
direct import of the module whose functions a file calls. The example opens a
connection per request to stay short. A server keeps one
connection per worker (connections are not shared between threads), so the
statement cache is warm on every request after the first.

Which call to use:

- `query_rows_json` for "these rows, as a list": you write an ordinary SELECT.
- `query_row_json` for "this row, as an object".
- `query_json` when the shape is yours: nesting (`json_object('post',
  json_object(...))`), an envelope, `INSERT ... RETURNING json_object(...)`.

## Release workflow

```sh
bin/check
bin/release
unzip -tq "dist/hey_sqlite3-0.5.1.zip"
bin/source-zip
bin/publish --no-commit
```

`bin/publish` refuses to overwrite an existing version and defaults to `$HOME/dev/jayteesf.github.io/packages`.
