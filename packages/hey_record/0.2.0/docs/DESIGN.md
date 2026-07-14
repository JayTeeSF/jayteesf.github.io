# Design: hey_record

## Connection contract

An adapter connection is an immutable object containing a dialect name and callable fields:

- `query(connection, sql)` and `query_params(connection, sql, parameters)`;
- `execute(connection, sql)` and `execute_params(connection, sql, parameters)`;
- optional `begin`, `commit`, `rollback`, and `close`.

The driver returns `Result` values containing `rows`, `columns`, `changes`, and `last_insert_id` where applicable.

## SQL plans

`HeyRecordSql` validates and quotes identifiers, then returns SQL and values separately. Empty `IN` lists become `1 = 0`. Unscoped update/delete operations fail. Raw order expressions are available only through the explicitly named `order_raw` escape hatch.

## Models

A model is a descriptor around a connection, table, primary key, and options. It does not hide global connections or mutable object identity.

## Migrations

DDL helpers accept a dialect descriptor so SQLite `AUTOINCREMENT` and MySQL `AUTO_INCREMENT` remain adapter-aware. Migration persistence and locking are future package slices.
