# hey_record 0.2.0

`hey_record` is database-independent porcelain for Hey. It combines Sequel-style immutable datasets and explicit connections with a small Active Record-style model/migration vocabulary.

It contains no C code and no database driver. Applications choose `hey_sqlite3`, `hey_mysql`, or another adapter implementing the connection callback contract.

## Plumbing and porcelain

- Driver packages own native handles, sockets, blocking policy, parameter binding, and rows.
- `hey_record` owns SQL plans, dialect quoting, datasets, transactions, model descriptors, and migration DDL.
- Applications own domain models, validations, authorization, Jobs, and deployment configuration.

## Use with SQLite

```hey
import 'pkg:hey_record@0.2.0/main'
import 'pkg:hey_sqlite3@0.2.0/main'

let opened = Sqlite3.connect('app.sqlite3', {})
let database = opened.value
let Cards = HeyRecordModel.define(database, 'cards', {timestamps: true})

HeyRecordModel.create(Cards, {name: 'Ada'})
let cards = HeyRecordModel.where(Cards, {name: 'Ada'})
let rows = HeyRecord.all(cards)

HeyRecord.close(database)
```

## Parameterized plans

Dataset reads/writes create `{sql, parameters}` plans. SQLite binds them with native prepared statements. The MySQL 0.2.0 adapter uses Connector/C escaping and declares that limitation; its planned 0.3.0 release will provide server-side statements.

## Deliberate limits

Associations, validations, callbacks, identity maps, schema dumping, migration bookkeeping, and connection pools are not yet claimed. They should be added as independent, testable porcelain rather than hidden inside the language or native drivers.
