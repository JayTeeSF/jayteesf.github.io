# Design: hey_sqlite3

## Ownership

`native.open` returns an extension capability. SQLite open returns a database capability. Prepare returns a statement capability. `Sqlite3.close` closes the database before unloading the extension; every query and execute path finalizes its statement.

## Concurrency

The manifest marks storage and lock-sensitive calls as blocking and non-thread-safe. The loader serializes calls for one extension, but application architecture should still assign each connection to one bounded or partitioned Job lane. Multiple connections provide parallelism.

## Adapter contract

The porcelain connection exposes callable fields consumed by `hey_record`:

- `query(connection, sql)`
- `query_params(connection, sql, parameters)`
- `execute(connection, sql)`
- `execute_params(connection, sql, parameters)`
- `begin`, `commit`, `rollback`, `interrupt`, and `close`

The JSON calls (`Sqlite3.query_json`, `query_rows_json`, `query_row_json`) are
module functions, not connection fields: hey_record does not use them.

Rows preserve SQLite integers, floats, text, blobs, and nulls. Parameter binding is server/native prepared-statement binding, not string interpolation.

The record also carries `kind: 'hey_record_connection'` and `dialect: 'sqlite3'`, and every execute result reports `changes` (affected rows) and `last_insert_id` -- `changes` is what lets hey_record's store delete report an absent record as the typed error `not_found`. `specs/store_conformance_spec.hey` proves the full store round-trip over a real file database using a hand-copied copy of hey_record 0.3.0's sqlite3-dialect store SQL (hey_record consumes this adapter; locking it here would invert the package layering, so the shim is deliberate and labeled).

`Sqlite3.connect(database, options)` keeps its positional signature; `Sqlite3.connect_options(options)` additionally accepts `{database, ...options}` to mirror `Mysql.connect(options)` for consumers wanting one shape. Whether the adapter surfaces unify on a single signature (breaking sqlite3 callers) is the framework-extraction design's open question Q4.

## JSON built by SQLite (0.5.0)

An HTTP API that answers in JSON spends most of a request turning rows into
Hey objects (`query_params`) and those objects back into text
(`Json.encode`): 245 us for a 20-row feed, against 35 us when SQLite writes the
JSON itself (`tools/json_bench.hey`). hey_fast_web reached that by dropping to
`Sqlite3Native` (prepare, step, column_text, reset by hand). 0.5.0 makes it a
first-class adapter call with the adapter's guarantees: typed Results, the
statement cache, statements always given back reset.

### The calls

- `query_json(connection, sql, parameters)`: the caller writes the JSON
  (`json_object`, `json_group_array`, ...) and gets the first row's text,
  unparsed. It is the general tool: any nesting, envelopes, and
  `INSERT ... RETURNING json_object(...)`.
- `query_rows_json(connection, sql, parameters)`: any SELECT; the adapter has
  SQLite wrap its rows as an array of objects keyed by column name.
- `query_row_json(connection, sql, parameters)`: the same, the first row as
  one object.
- `query_rows_json_with` / `query_row_json_with(..., options)`:
  `{json_columns: [...]}` for columns that hold JSON text and should nest.

Decisions, each pinned by `specs/json_spec.hey`:

- **Zero rows.** `query_json` and `query_row_json` give `ok(nil)` (an HTTP
  handler's 404); `query_rows_json` gives `ok('[]')`.
- **Only the first row is read** by `query_json` / `query_row_json`; the
  statement is reset. No error for more rows: `LIMIT 1` costs nothing, and
  stepping again to refuse would cost every call.
- **Refused, as `Result.err`:** more than one column (`query_json`); a value
  that is not TEXT, NULL included (`query_json`: JSON built by SQLite is always
  TEXT, so anything else is a mistake in the SQL); duplicate column names (an
  object with repeated keys is legal JSON that most readers silently collapse,
  so the caller aliases one); BLOB values (JSON has no bytes; SQLite >= 3.45
  would read a BLOB as JSONB and either fail with "malformed JSON" or decode it
  into an unrelated value, x'00' becoming null); unknown `json_columns`
  entries (typos). The text is not re-validated: it is what SQLite's JSON
  functions wrote.

### How the rows calls work

The caller's statement is prepared (from the cache, never stepped) only to read
its column names. One native call (`native/hey_sqlite3_json.c`) writes:

```sql
WITH hey_sqlite3_json_rows(c0, c1, ...) AS (
<caller SQL>
) SELECT json_group_array(json_object(
    'name0', hey_sqlite3_json_value(c0, 'name0'), ...))
  FROM hey_sqlite3_json_rows
```

- **Quoting.** The CTE column list renames the caller's columns to `c0..cN`,
  so a column name is never an identifier. It appears only inside
  single-quoted string literals, with `'` doubled. A name with `"`, `'`,
  spaces, backslashes, non-ASCII, or an expression name such as `count(*)`
  needs nothing more, and duplicate names could not confuse a column
  reference even if they were allowed. (Quoting each name as an identifier,
  `"col"`, was the alternative; it depends on SQLite naming a subquery's
  columns exactly as it names the top-level statement's, which it does not do
  for duplicates (`a`, `a:1`).)
- **Values.** `hey_sqlite3_json_value(value, name)` is a deterministic SQL
  function registered on every connection (`native/hey_sqlite3_functions.c`):
  it returns the value unchanged and raises an error naming the column for a
  BLOB. It costs about 5 us per 100 values.
- **Nested JSON.** SQLite marks the result of a JSON function as JSON (a value
  subtype) only within one expression: through a subquery or CTE it is plain
  text again, so a column built by `json_object` in the caller's SQL, or a
  stored JSON document, would come out as a JSON *string*. Guessing from the
  text (`json_valid`) would turn the text `"123"` into a number, so it is not
  done; `json_columns` names the columns to re-read with `json()`.
- **Order.** SQL does not define the order in which an aggregate sees its
  rows. SQLite does: it keeps a FROM-clause subquery's ORDER BY when the outer
  query uses an order-sensitive aggregate (`json_group_array`, `group_concat`):
  the query flattener will not flatten it (rule 16, from ticket #2942 in 2008,
  for `group_concat`), and since 3.41, when the planner drops ORDER BY clauses
  that do nothing, it keeps this one (`SF_OrderByReqd`). The spec checks the
  order on every run, against whichever SQLite the library is linked with
  (descending, multi-key with LIMIT, bound parameters), and the
  `HEY_SQLITE3_NEGATIVE_CONTROL_JSON_ORDER` build shows the spec fails when the
  order is lost.
- **The caller's SQL** is placed in the CTE body after trailing whitespace and
  semicolons are trimmed, followed by a newline, so a trailing `-- comment`
  cannot comment out the closing parenthesis. A second statement is not
  removed: the wrapper fails to prepare and nothing runs. A write
  (`INSERT ... RETURNING`) is not a CTE body either, so it is refused the same
  way, before anything runs; `query_json` is the call for writes that return
  JSON.
- **Parameters** keep their numbers: the wrapper adds none before the caller's
  SQL, so `?`, `?NNN`, `:name` bind as they would on the statement alone.
- **Cost.** About 11 us over hand-written SQL for the 20-row feed (46 vs 35
  us): one cached prepare to read names, one native call to write the
  wrapper, the BLOB guard. The wrapper was first built in Hey; that was 57 us,
  because one native call per column plus Hey string building cost 17 us.
  `json_group_array` and `'[' || group_concat(...) || ']'` measured the same
  (35 us) and give the same bytes; `json_group_array` needs no special case
  for zero rows.

Against hey_fast_web's hand-stepped statement (prepared once, `step`,
`column_text`, `reset`), `query_json` on the same feed SQL measured 20.5 us
to 15.5 us: the price of the cache lookup, the bind-count check, the column
count and type checks and typed Results. Fusing those checks into one native
call would save perhaps 2 us; not done.

### Statement cache

`query_json` uses the cache like `query_params`. The rows calls use two
entries per distinct SQL text (the caller's statement and the wrapper), so a
connection's 64 idle statements hold 32 such queries. A schema change needs
nothing: the caller's statement is re-prepared by SQLite, its names are read
on every call, and a changed column list produces a new wrapper text.

### Not done

- An option to encode BLOBs (hex or base64) instead of refusing them: the
  caller decides the representation in SQL today (`hex(col) AS col`).
- `query_json` validating that its text is JSON: it would re-parse every
  body to catch a mistake the caller can see the first time.

## Version single source

The only in-source version literal is `hey_sqlite3_version_value()` in `adapter.hey`; `Sqlite3.version()`, `HeySqlite3Info.version()`, and the `.hey/native/hey_sqlite3/<version>/` library search path all derive from it. `bin/package-check` greps the literal against the `VERSION` file and runs `tools/version_receipt.hey` interpreted and compiled, byte-compared against `VERSION`, so in-source version drift (the `0.2.2`-at-`0.2.6` defect) fails the gate.

## What remains package-owned

- contained SQLite amalgamation and provenance;
- backup, incremental blob, and online migration APIs;
- connection pool/Job lane helpers;
- target-specific prebuilt release assets;
- Windows native-loader receipt after Hey promotes it.

## Packaging boundary

`bin/package-check` owns package-specific behavior. `hey_packager` owns manifest verification, required documentation, execution of `docs/examples/basic.hey`, release artifacts, checksums, and registry publication. This prevents each package from reimplementing release policy.
