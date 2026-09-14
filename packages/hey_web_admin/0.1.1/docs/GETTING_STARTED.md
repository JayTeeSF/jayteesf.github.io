# Getting started

## 1. Run the example first

```sh
./bin/heyc docs/examples/basic.hey
```

It creates, lists and deletes a record, and prints assertions about the
response bodies. If that works, the package works.

## 2. Describe your resource

A resource is a collection plus (optionally) a field list.

```hey
let store  = HeyRecordStore.file('db/data')      # or HeyRecordStore.sql(conn, table)
let source = HeyAdminSource.record_store(store, 'projects')

let projects = HeyAdmin.resource('projects', source, {
  singular: 'project',
  fields: [
    HeyAdminField.required_text('name', 'Name'),
    HeyAdminField.long_text('notes', 'Notes')
  ]
})
```

**Declaring fields is optional.** With none, the field list is inferred
from the rows the collection actually contains. That is the fastest way
to see something, and the list screen tells you which columns were
guessed. Declare when you want labels, ordering, required-ness, or a
column that is empty in every existing row. `strict_fields: true` means
"exactly what I declared, nothing else".

## 3. Write the handler and the guard

Hey has no closures, so the handler reaches its config through a module
function:

```hey
module MyAdmin
  fn config()
    return HeyAdmin.config('/admin', [projects], {authorize: MyAuth.check})
  end
  fn handle(request)
    return HeyAdmin.handle(MyAdmin.config(), request)
  end
end
```

`authorize(request) -> bool` is **required**. Without it the admin
refuses to mount and produces zero routes. See
[the guard section](../README.md#authorization-is-not-optional) — this
is the one part of the package that is not quick and dirty.

## 4. Mount it

```hey
let allowed = HeyAdmin.mount_check(MyAdmin.config())
if allowed.ok == false
  fail allowed.error
end

let routes = [
  ...App.routes(),
  Web.get('/admin', MyAdmin.handle),
  Web.get('/admin/:resource', MyAdmin.handle),
  Web.get('/admin/:resource/new', MyAdmin.handle),
  Web.get('/admin/:resource/:id', MyAdmin.handle),
  Web.get('/admin/:resource/:id/edit', MyAdmin.handle),
  Web.get('/admin/:resource/:id/delete', MyAdmin.handle),
  Web.post('/admin/:resource', MyAdmin.handle),
  Web.post('/admin/:resource/:id', MyAdmin.handle),
  Web.post('/admin/:resource/:id/delete', MyAdmin.handle)
]

let served = Web.serve(routes, {host: '127.0.0.1', port: 9292, workers: 2})
```

`/new` before `/:id` is load-bearing; `HeyAdmin.paths('/admin')` returns
them in the required order.

`HeyAdmin.mount(config, MyAdmin.handle)` does this in one line but is
interpreter-lane only today — see the README.

## 5. Test your screens without a socket

`HeyAdmin.handle` takes a plain record, so your own specs can assert on
real response bodies:

```hey
let response = MyAdmin.handle({method: 'GET', path: '/admin/projects', headers: {}, query: '', body: ''})
if Text.contains?(response.body, 'Expected value') == false
  fail 'the list did not render the record'
end
```

Assert on the **body**. A 200 with an empty body passes a status check.
