# Rails' adapter architecture, and what hey_record is missing

Research note + design proposal. Written 2026-09-07.

**Status: research and design only.** No `.hey` source was changed to produce this
document. Every Rails claim below is cited to a file and, where the code has
changed over releases, to a tagged version. Things I could not verify are
collected in the last section rather than smoothed over.

Rails source is read at `rails/rails` commit
`e970c80fd668f3f4ee08201bbbbcadfb2f29b1df` (branch `main`,
`RAILS_VERSION` = `8.2.0.alpha`). Permalinks in the Sources section use that SHA
so they do not rot.

---

## 1. Why this document exists

Three production failures in one consuming application, all of them the same
missing layer:

1. **A `boolean` column was written as the TEXT `'true'` and read back as the
   string `'true'`.** Every `x == true` test in the product was therefore false,
   and every answer was graded wrong.
2. **`jsonb` columns arrived as raw TEXT.** `get(payload, 'key')` raised;
   question stems and lesson bodies rendered blank; a background worker died on
   its first job.
3. **PostgreSQL-only functions (`set_config`, `make_interval`, `to_timestamp`)
   reached SQLite** and failed at runtime.

(1) and (2) are the *type* problem. (3) is the *dialect capability* problem.
Rails separates these two concerns cleanly and solves both. hey_record currently
solves neither, because it has no layer between "the driver handed me a value"
and "the application uses the value".

---

## 2. What exists in the Hey stack today (verified by reading the source)

### 2.1 `hey_record` 0.3.0 — 1110 lines

| File | Lines | What it owns |
| --- | ---: | --- |
| `dialect.hey` | 24 | `{name, identifier_quote, auto_increment, boolean_true, boolean_false}` for `sqlite3` and `mysql`. `named()` refuses unknown names. |
| `sql.hey` | 200 | Identifier validation/quoting, literal rendering, `select/insert/update/delete` plans returning `{sql, parameters}`. |
| `dataset.hey` | 174 | Chainable dataset; dispatches through the connection record's callable fields. |
| `model.hey` | 49 | Thin descriptor over connection + table + primary key. |
| `migration.hey` | 73 | DDL string builders. |
| `migrate.hey` | 234 | `schema_migrations` ledger, file and SQL targets. |
| `store.hey` | 326 | JSON document store over `(collection_name, record_id, payload)`. |
| `main.hey` | 30 | Version + capabilities. |

**The type-relevant facts.** `hey_record` has exactly one place where a Hey value
is turned into something a database understands, `hey_record_literal_value` in
`sql.hey`:

```hey
if type(value) == 'boolean'
  if value
    return dialect.boolean_true      # '1'
  end
  return dialect.boolean_false       # '0'
end
```

That is *only* reached from `HeyRecordSql.literal` / `literal_insert`, which the
package's own comment marks as "reserved for DDL/debug output. Dataset writes
use plans." So the normal write path (`insert_plan`, `update_plan`,
`conditions_plan`) passes application values **straight through to the driver
untouched**. There is no serialize step at all.

And there is **no read path**. `HeyRecord.all` returns `outcome.value.rows`
exactly as the driver produced them. There is no deserialize step, no column
type knowledge, no schema introspection anywhere in the package. `dialect.hey`
knows four strings per dialect and nothing about types.

### 2.2 `hey_sqlite3` 0.3.4

Real prepared statements over a native SQLite extension. Two functions matter
here:

- `Sqlite3Native.bind_value` (`Native.hey:135`) maps Hey values onto SQLite
  bindings: `nil`→`bind_null`, `integer`→`bind_i64`, `float`→`bind_f64`,
  `bytes`→`bind_bytes`, `boolean`→`bind_i64(1|0)`, **everything else →
  `bind_text('' + value)`**.
- `Sqlite3Native.column_value` (`Native.hey:232`) reads back by SQLite *storage
  class*: type 5→`nil`, 1→`i64`, 2→`f64`, 4→`bytes`, else `text`.

So hey_sqlite3 already binds a Hey `boolean` as `1`/`0` correctly. But nothing
declares that a column *is* boolean, so `column_value` returns integer `1`, and
`1 == true` is false in Hey. And a Hey record/map bound as a parameter is
stringified by `'' + value` — which is how a JSON payload becomes unparsed TEXT.

The connection record is a plain map with `dialect: 'sqlite3'` and callable
fields `query`, `query_params`, `execute`, `execute_params`, `begin`, `commit`,
`rollback`, `interrupt`, `close`. `capabilities()` reports transport-level facts
only (`prepared_statements`, `typed_bindings`, `blobs`, `transactions`,
`cancellation`, `pooling`). It reports nothing about SQL surface.

### 2.3 `hey_mysql` 0.3.1

Same connection-record shape, `dialect: 'mysql'`, plus `from_env` config and
`capabilities()`. Two facts dominate any type design:

- **No prepared statements.** `capabilities()` literally says
  `prepared_statements: false, parameter_binding: 'connector-c-escape'`.
  `hey_mysql_interpolate_value` splices escaped literals into the SQL string.
  Its `hey_mysql_literal_value` maps `boolean` → `'1'`/`'0'` (correct for MySQL)
  and refuses `bytes` with `mysql_binary_parameter_unsupported`.
- **Every non-NULL column comes back as a string.** `hey_mysql_row_value` calls
  `MysqlNative.column_text(result_set, index)` for every column. There is no
  `column_i64`. An `INT` column reads back as `'42'`, a `TINYINT(1)` as `'1'`, a
  `DATETIME` as `'2026-09-07 12:00:00'`. This is exactly the mysql2 C driver's
  text protocol, and it is exactly the situation Rails' `deserialize` exists to
  fix.

### 2.4 `hey_postgres`

Spec only — `README.md`, `PACKAGE_SPEC.md`, `BUILDER_START_HERE.md`. Zero `.hey`
files. The spec already asks for `Postgres.Row` accessors
(`text/bytes/int/float/bool/uuid/json/timestamp` and nullable variants) and says
"decoder failures include column and PostgreSQL type OID". It wraps `PQftype`
and `PQfmod`. **That is the right raw material and it is not yet a type map** —
per-call accessors put the type decision at every call site, which is precisely
the design that produced failure (1). The recommendations in §6 keep those
accessors but move the *decision* into hey_record.

### 2.5 Language constraints that shape the design

- **There is no regex.** `~/dev/hey-lang-bootstrap-plan/stdlib` has no `Regex`
  module, and no package in the stack imports one. `sql.hey` validates
  identifiers by scanning characters with `find(allowed, ch)`. Rails' type map
  is keyed on `Regexp`; a Hey port must use a normalized-token matcher instead
  (§5.3).
- **There is no date/time parser.** `stdlib:Time` exposes `now_ns`, `unix_ms`,
  `utc_iso8601`, `utc_iso8601_at(unix_ms)`, `elapsed_ns`, `ns_to_ms`,
  `rows_per_second`. It formats; it does not parse. A `datetime` deserializer
  must carry its own fixed-width ISO-8601 / `YYYY-MM-DD HH:MM:SS` parser built
  from `Text.slice` + `Text.parse_int`.
- `stdlib:Json` gives `decode`, `encode`, `encode_canonical`,
  `encode_canonical_line` — everything the `json` type needs.
- `stdlib:Text` gives `parse_int`, `parse_fixed(value, scale)`, `lower`,
  `starts_with?`, `contains?`, `find`, `slice`. Enough for the token matcher and
  the numeric casts.
- Package convention (from `docs/DESIGN.md` and the source): **no nil crosses a
  public API**; every operation returns a `Result` record with a typed error
  code. The type layer must follow this.

---

## 3. Rails: the adapter contract

`ActiveRecord::ConnectionAdapters::AbstractAdapter` is a base class, not a
duck-typed interface, so "required" means "the base class raises
`NotImplementedError` or the adapter cannot function", and "optional" means
"the base class has a working default you may override".

### 3.1 Required — no working default

| Method | Base behavior | Notes |
| --- | --- | --- |
| `quote_column_name(name)` | `raise NotImplementedError` | Declared on `Quoting::ClassMethods`; the only quoting method with no default. |
| `native_database_types` | Adapters define `NATIVE_DATABASE_TYPES` | Maps logical type (`:string`, `:boolean`, `:json`, …) to the DDL type name. Drives `valid_type?`. |
| `column_definitions(table_name)` | not defined on the base | Adapter-private; returns raw per-column rows from the backend's catalog. |
| `new_column_from_field(table, field, definitions)` | not defined on the base | Turns one catalog row into a `Column`, **including its cast type**. |
| `translate_exception(e, ...)` | generic fallthrough | Maps driver errors onto `ActiveRecord::RecordNotUnique`, `InvalidForeignKey`, etc. |
| `reconnect` | `raise NotImplementedError` (`abstract_adapter.rb:1228`) | |
| `build_insert_sql(insert)` | `raise NotImplementedError` (`abstract_adapter.rb:947`) | Explicitly "adapter-specific logic for handling duplicates during INSERT". |
| `dbconsole(config, options)` | `raise NotImplementedError` (`abstract_adapter.rb:142`) | |

### 3.2 Required-by-convention — the DDL verbs

`abstract/schema_statements.rb` raises `NotImplementedError` with a message for
`indexes` (:87), `rename_table` (:588), `change_column` (:781),
`change_column_default` (:799), `change_column_null` (:819), `rename_column`
(:832), `foreign_keys` (:1199), `change_foreign_key` (:1340). A backend that
cannot do these natively must **emulate** them (see §7).

### 3.3 Optional — defaults exist and are usually right

`quote`, `quote_string`, `quote_table_name`, `quoted_true/false`,
`unquoted_true/false`, `quoted_date`, `quoted_time`, `quoted_binary`,
`type_cast`, `cast_bound_value`, `type_casted_binds`, `lookup_cast_type`,
`initialize_type_map`, `extended_type_map`, `disable_referential_integrity`, and
the whole `supports_*` family.

### 3.4 The capability predicates

Every one of these is a plain boolean method on the adapter, defaulting to
`false` on `AbstractAdapter` unless noted (`abstract_adapter.rb:435-631`):

```
supports_ddl_transactions?          supports_bulk_alter?
supports_savepoints?                supports_restart_db_transaction?
supports_advisory_locks?            prefetch_primary_key?
supports_partitioned_indexes?       supports_index_sort_order?
supports_partial_index?             supports_index_include?
supports_expression_index?          supports_explain?
supports_transaction_isolation?     supports_extensions?
supports_indexes_in_create?         supports_foreign_keys?
supports_validate_constraints?      supports_deferrable_constraints?
supports_enforced_foreign_keys?     supports_check_constraints?
supports_exclusion_constraints?     supports_unique_constraints?
supports_views?                     supports_materialized_views?
supports_datetime_with_precision?   supports_json?
supports_comments?                  supports_comments_in_create?
supports_virtual_columns?           supports_foreign_tables?
supports_optimizer_hints?           supports_common_table_expressions?
supports_lazy_transactions?         supports_insert_returning?
supports_update_returning?          supports_insert_on_duplicate_skip?
supports_insert_on_duplicate_update? supports_insert_conflict_target?
supports_concurrent_connections?    supports_nulls_not_distinct?
supports_disabling_indexes?
```

They are cheap, they are queried by the shared code before it emits SQL, and
several of them are **version-gated at runtime**, not hardcoded:

```ruby
# mysql2_adapter.rb
def supports_json?
  !mariadb? && database_version >= "5.7.8"
end
```

That is the shape of the answer to failure (3): the *shared* layer never emits a
backend-specific function; it asks a predicate and either takes a different path
or refuses.

---

## 4. The quoting layer

`ActiveRecord::ConnectionAdapters::Quoting` (`abstract/quoting.rb`) is small and
does two clearly different jobs. Conflating them is the single most common
source of the "boolean stored as `'true'`" family of bugs.

### 4.1 `quote` — value into a **SQL literal string**

```ruby
def quote(value)
  case value
  when String, Symbol then "'#{quote_string(value.to_s)}'"
  when true       then quoted_true
  when false      then quoted_false
  when nil        then "NULL"
  when BigDecimal then value.to_s("F")
  when Numeric    then value.to_s
  when Type::Binary::Data then quoted_binary(value)
  when Type::Time::Value  then "'#{quoted_time(value)}'"
  when Date, Time then "'#{quoted_date(value)}'"
  when Class      then "'#{value}'"
  else raise TypeError, "can't quote #{value.class.name}"
  end
end
```

Note the `else raise`. Rails does **not** fall back to `to_s`. An unknown object
is a loud `TypeError` at the call site, not a silently stringified value in the
database. This is the exact discipline that would have caught failure (1).

### 4.2 `type_cast` — value into a **bind parameter**

```ruby
def type_cast(value)
  case value
  when Symbol, Type::Binary::Data then value.to_s
  when true  then unquoted_true
  when false then unquoted_false
  when BigDecimal then value.to_s("F")
  when nil, Numeric, String then value
  when Type::Time::Value then quoted_time(value)
  when Date, Time then quoted_date(value)
  else raise TypeError, "can't cast #{value.class.name}"
  end
end
```

Same shape, different output: no surrounding quotes, and it uses
`unquoted_true`/`unquoted_false` rather than `quoted_true`/`quoted_false`. A
third hook, `cast_bound_value`, exists purely for backends whose comparison
semantics are dangerous:

> "MySQL might perform dangerous castings when comparing a string to a number,
> so this method will cast numbers to string." — `abstract/quoting.rb`

### 4.3 What each backend overrides, and why

| Hook | Abstract (`main`) | SQLite3 | PostgreSQL | MySQL |
| --- | --- | --- | --- | --- |
| `quote_column_name` | `raise NotImplementedError` | `"..."`, `"` doubled | `PG::Connection.quote_ident` | `` `...` ``, `` ` `` doubled |
| `quote_table_name` | defaults to `quote_column_name` | `"..."`, `.` → `"."` | `Utils.extract_schema_qualified_name(...).quoted` (schema-aware) | `` ` ``, `.` → `` `.` `` |
| `quote_table_name_for_assignment` | `quote_table_name("t.c")` | `quote_column_name(attr)` | `quote_column_name(attr)` | inherits (MySQL allows `t.c` on the left of `SET`) |
| `quote_string` | `\` → `\\`, `'` → `''` | `::SQLite3::Database.quote(s)` | `connection.escape(s)` (connection-encoding aware) | inherits from driver |
| `quoted_true` / `quoted_false` | `"TRUE"` / `"FALSE"` | **not overridden** | **not overridden** | **not overridden** |
| `unquoted_true` / `unquoted_false` | `true` / `false` | `1` / `0` | inherits `true`/`false` | `1` / `0` |
| `cast_bound_value` | identity | inherits | inherits | `true`→`"1"`, `false`→`"0"`, `Numeric`→`to_s` |
| `quoted_binary` | `'...'` | `x'<hex>'` | `'<PQescapeBytea>'` | `x'<hex>'` |
| `quoted_time` | strip the date off `quoted_date` | strip, then **re-prefix `2000-01-01 `** | inherits | inherits |
| `quoted_date` | `to_fs(:db)` + `.%06d` usec | inherits | prepend BC handling for year ≤ 0 | inherits |
| `type_cast` | see §4.2 | `BigDecimal`/`Rational`→`to_f`; re-encode ASCII-8BIT strings as UTF-8 | `Binary::Data`→`{value:, format: 1}`; arrays and ranges encoded to PG wire text | `TimeWithZone`/`Time` → real `Time` in the right zone, `Date` passed through (mysql2 handles them natively) |
| `lookup_cast_type(sql_type)` | `type_map.lookup(sql_type)` | inherits | `super(query_value("SELECT #{quote(sql_type)}::regtype::oid").to_i)` — resolves a *name* to an OID first | inherits |

**Why SQLite is `1`/`0` for bindings but `TRUE`/`FALSE` for literals.** SQLite
has no boolean storage class; a boolean is an INTEGER 1 or 0
(<https://www.sqlite.org/datatype3.html>). SQLite ≥ 3.23 does recognize the
keywords `TRUE`/`FALSE` in SQL text and folds them to 1/0, and modern Rails
requires SQLite ≥ 3.35 (`check_version` in `sqlite3_adapter.rb:503`), so the
abstract `quoted_true`/`quoted_false` are safe for inline literals. Bindings
never go through SQL text, so `unquoted_true`/`unquoted_false` must be the real
storage values, `1`/`0`.

**The history is the cautionary tale.** In Rails 4.2 the *abstract*
`quoted_true` was `"'t'"` and `unquoted_true` was `'t'`
(`v4.2.11.3 abstract/quoting.rb:66-80`) — so SQLite stored booleans as the TEXT
`'t'`/`'f'`. Rails 5.2 introduced an opt-in flag to migrate:

```ruby
# v5.2.8.1 sqlite3/quoting.rb
def quoted_true
  ActiveRecord::ConnectionAdapters::SQLite3Adapter.represent_boolean_as_integer ? "1".freeze : "'t'".freeze
end
```

with `class_attribute :represent_boolean_as_integer, default: false` in
`v5.2.8.1 sqlite3_adapter.rb:92`. By Rails 6.0 the flag was gone and `1`/`0` was
the only behavior (`v6.0.6.1 sqlite3/quoting.rb:32-46`). Rails needed **two
major releases and a deprecation flag** to change one storage representation,
because the on-disk bytes were wrong and existing rows had to be migrated. That
is the cost of getting this wrong, and it is the cost hey_record is currently
exposed to.

**Why MySQL is `1`/`0`.** MySQL has no boolean type either; `BOOLEAN` is an alias
for `TINYINT(1)`. `TRUE`/`FALSE` are literal aliases for `1`/`0`, so
`quoted_true` needs no override, but `unquoted_true` must be `1`.
`cast_bound_value` goes further and returns the **string** `"1"`, because
mysql2 binds and MySQL's implicit string/number comparison rules make a numeric
bind against a string column a silent full scan or worse.

**Why PostgreSQL is `TRUE`/`FALSE`.** Postgres has a real `bool` type and the
driver binds Ruby `true`/`false` directly. No override needed. Its interesting
overrides are all about types Postgres has and the others do not: `bytea`
escaping, arrays, ranges, `xml`, bit strings, and BC dates.

---

## 5. The type map — the heart of it

### 5.1 Three operations, not one

`ActiveModel::Type::Value` (`activemodel/lib/active_model/type/value.rb`)
defines the whole contract:

```ruby
# database -> Ruby
def deserialize(value)
  cast(value)          # DEFAULT ONLY
end

# user input -> Ruby
def cast(value)
  cast_value(value) unless value.nil?
end

# Ruby -> database
def serialize(value)
  value
end
```

With the doc comments spelled out:

- `cast` — "Type casts a value from user input (e.g. from a setter). This value
  may be a string from the form builder, or a ruby object passed to a setter.
  **There is currently no way to differentiate between which source it came
  from.**"
- `deserialize` — "Converts a value from database input to the appropriate ruby
  type. **The default implementation just calls Value#cast.**"
- `serialize` — "Casts a value from the ruby type to a type that the database
  knows how to understand. The returned value ... should be a String, Numeric,
  Date, Time, Symbol, true, false, or nil."

`deserialize` defaults to `cast` and that default is correct for most scalars —
which is exactly why it is easy to believe they are the same operation. They are
not.

### 5.2 Why `deserialize` must be separate from `cast` — the concrete case

`ActiveRecord::Type::Json` (`activerecord/lib/active_record/type/json.rb`) is
the proof:

```ruby
def deserialize(value)
  return value unless value.is_a?(::String)
  ActiveSupport::JSON.decode(value)          # (rescue elided)
end

def serialize(value)
  ActiveSupport::JSON::Encoding.encode_without_escape(value) unless value.nil?
end
```

`Json` does **not** override `cast`, so `cast` is the inherited identity. Now
consider a `json` column and the string `'{"a":1}'`:

| Operation | Input | Output | Why |
| --- | --- | --- | --- |
| `deserialize` | `'{"a":1}'` (from the DB) | `{"a" => 1}` | The database stores JSON as text. Text arriving *from* the database is always encoded JSON, so it must be decoded. |
| `cast` | `'{"a":1}'` (from a user setter) | `'{"a":1}'` | A user assigning a String to a JSON attribute means "store this string". `record.payload = '{"a":1}'` then `record.payload` is that String; it round-trips to the JSON *string* `"{\"a\":1}"` in the column. |

**If you conflate them, you break one of the two.** Make `cast == deserialize`
and `record.config = '{"a":1}'` silently becomes a Hash — you can no longer
store a JSON-encoded string in a JSON column, and a user string that happens to
look like JSON is reinterpreted behind their back. Make `deserialize == cast`
(the identity) and you get **failure (2) exactly**: every `jsonb` column arrives
as raw TEXT and `get(payload, 'key')` raises.

A second, sharper example: `ActiveRecord::Type::Serialized`
(`activerecord/lib/active_record/type/serialized.rb`) wraps a subtype with a
coder. Its `deserialize` runs `coder.load(super)` — decode from storage — while
`serialize` runs `coder.dump(value)`. `cast` is delegated untouched to the
subtype. The three operations are three genuinely different transforms; only in
the degenerate scalar case do two of them coincide.

A third: `ActiveModel::Type::Boolean#serialize(value)` is defined as
`cast(value)` — an explicit *opt-in* to reusing cast on the write side, written
out because it is a decision rather than a default.

### 5.3 `Type::Boolean` in detail

```ruby
FALSE_VALUES = [
  false, 0, "0", :"0", "f", :f, "F", :F,
  "false", :false, "FALSE", :FALSE, "off", :off, "OFF", :OFF,
].to_set.freeze

def cast_value(value)
  if value == "" then nil else !FALSE_VALUES.include?(value) end
end
```

This one set is what makes all three backends agree:

- SQLite hands back integer `1`/`0` → `0` is in the set → `false`; `1` is not →
  `true`.
- PostgreSQL's text protocol hands back `"t"`/`"f"` → `"f"` is in the set →
  `false`; `"t"` is not → `true`.
- MySQL's text protocol hands back `"1"`/`"0"` → same as SQLite.
- Legacy rows written by Rails ≤ 5.1 into SQLite hold `"t"`/`"f"` → still
  correct.
- `""` → `nil`, so an empty form field is "unset", not `false`.

Everything not in the set is `true`. Note the consequence: the string `"true"`
is `true`, but so is the string `"banana"`. Rails deliberately chose a
false-list over a true-list so that no unexpected representation silently reads
as `false`. **A boolean deserializer that special-cases only `1` and `0` will
mis-read a legacy or cross-backend row.**

### 5.4 `Type::DateTime`

`ActiveModel::Type::DateTime` mixes in `Helpers::TimeValue`, `Helpers::Timezone`
and `Helpers::AcceptsMultiparameterTime`. Its `cast_value`:

```ruby
def cast_value(value)
  return apply_seconds_precision(value) unless value.is_a?(::String)
  return if value.empty?
  fast_string_to_time(value) || fallback_string_to_time(value)
end
```

Three things worth carrying over:

1. **A non-String is not re-parsed** — it only gets its sub-second precision
   truncated to the column's declared precision (`apply_seconds_precision`).
2. **Parsing is two-tier**: `fast_string_to_time` (`Time.new(string, in: "UTC")`,
   ISO-8601 fast path, `rescue ArgumentError → nil`) with
   `fallback_string_to_time` (`Date._parse`) behind it.
3. **`0000-00-00 00:00:00` becomes `nil`**, not an error — `new_time` returns
   early when `year == 0 && mon == 0 && mday == 0`. That is a MySQL-specific
   zero-date landmine handled in shared code.

The `serialize` side lives in `TimeValue#serialize_cast_value`: apply precision,
then `getutc` or `getlocal` per `default_timezone`. Timezone is not a type
property — it is an *adapter* property threaded into the type at map-build time
(§5.6).

### 5.5 `TypeMap` — how a SQL type string finds a type object

`activerecord/lib/active_record/type/type_map.rb`:

```ruby
def lookup(lookup_key)
  fetch(lookup_key) { Type.default_value }
end

def perform_fetch(lookup_key, &block)
  matching_pair = @mapping.reverse_each.detect { |key, _| key === lookup_key }
  if matching_pair      then matching_pair.last.call(lookup_key).freeze
  elsif @parent         then @parent.perform_fetch(lookup_key, &block)
  else                       yield lookup_key
  end
end
```

Four properties to reproduce:

1. **Keys are matched with `===`, and iterated in reverse registration order.**
   Regexp keys, and later registrations shadow earlier ones. This is how MySQL's
   `%r(^tinyint)i` beats the abstract `%r(int)i`.
2. **Values are lambdas, not instances.** They receive the full SQL type string,
   so `varchar(255)` yields `Type::String.new(limit: 255)` and `decimal(10,2)`
   yields `Type::Decimal.new(precision: 10, scale: 2)`.
3. **Maps chain to a parent.** `SQLite3Adapter::TYPE_MAP` is built by calling
   `super` (the abstract `initialize_type_map`) and then adding overrides.
4. **A miss is not an error.** `lookup` yields `Type.default_value` — the
   identity `Value` type. Rails prefers a pass-through String to a crash.

The abstract registrations (`abstract_adapter.rb:992-1023`):

```ruby
register_class_with_limit m, %r(boolean)i,      Type::Boolean
register_class_with_limit m, %r(char)i,         Type::String
register_class_with_limit m, %r(binary)i,       Type::Binary
register_class_with_limit m, %r(text)i,         Type::Text
register_class_with_precision m, %r(date)i,     Type::Date
register_class_with_precision m, %r(time)i,     Type::Time
register_class_with_precision m, %r(datetime)i, Type::DateTime
register_class_with_limit m, %r(float)i,        Type::Float
register_class_with_limit m, %r(int)i,          Type::Integer

m.alias_type %r(blob)i,      "binary"
m.alias_type %r(clob)i,      "text"
m.alias_type %r(timestamp)i, "datetime"
m.alias_type %r(numeric)i,   "decimal"
m.alias_type %r(number)i,    "decimal"
m.alias_type %r(double)i,    "float"

m.register_type %r(^json)i, Type::Json.new.freeze
m.register_type(%r(decimal)i) { |sql_type| ... }   # precision/scale from the string
```

`alias_type` is not a plain rename — it re-runs the lookup carrying the
parenthesised metadata across: `alias_type %r(numeric)i, "decimal"` turns
`numeric(10,2)` into a lookup of `"decimal(10,2)"`.

### 5.6 `extended_type_map` — the runtime-parameterised layer

Some type behavior depends on connection configuration, not on the SQL type
string. Rails keeps that out of the static map and rebuilds a child map keyed on
the configuration:

```ruby
def extended_type_map(default_timezone:)
  Type::TypeMap.new(self::TYPE_MAP).tap do |m|
    register_class_with_precision m, %r(\A[^\(]*time)i,     Type::Time,     timezone: default_timezone
    register_class_with_precision m, %r(\A[^\(]*datetime)i, Type::DateTime, timezone: default_timezone
    m.alias_type %r(\A[^\(]*timestamp)i, "datetime"
  end
end

def type_map                       # instance side
  if key = extended_type_map_key   # { default_timezone: ... }
    self.class::EXTENDED_TYPE_MAPS.compute_if_absent(key) { self.class.extended_type_map(**key) }
  else
    self.class::TYPE_MAP
  end
end
```

MySQL extends the key with `emulate_booleans`, and this is where `TINYINT(1)`
becomes a Ruby boolean (`abstract_mysql_adapter.rb:664-667`, `:878`):

```ruby
def extended_type_map(default_timezone: nil, emulate_booleans:)
  super(default_timezone: default_timezone).tap do |m|
    if emulate_booleans
      m.register_type %r(^tinyint\(1\))i, Type::Boolean.new
    end
    ...
  end
end
```

`class_attribute :emulate_booleans, default: true` (`:29`) — the entire "MySQL
booleans" story is one conditional registration in one map.

### 5.7 The three adapters' registrations

**SQLite3** (`sqlite3_adapter.rb:509-528`) — one override, and it is about
storage width, not affinity:

```ruby
class SQLite3Integer < Type::Integer
  private def _limit
    limit || 8      # SQLite's INTEGER storage class holds 8 bytes
  end
end
ActiveRecord::Type.register(:integer, SQLite3Integer, adapter: :sqlite3)

def initialize_type_map(m)
  super
  register_class_with_limit m, %r(int)i, SQLite3Integer
end
```

That is the *whole* SQLite3 type map delta. This is the most important
observation in this document for hey_record's purposes: **Rails does not consult
SQLite's column affinity at all.** It reads the *declared* type text from
`PRAGMA table_info` and matches it against the same regex map every other
adapter uses. A column declared `boolean` maps to `Type::Boolean` even though
SQLite gives it NUMERIC affinity and stores a 1. A column declared `json` maps
to `Type::Json` even though SQLite stores TEXT. Affinity is SQLite's business;
the declared type is the contract. `NATIVE_DATABASE_TYPES` names those declared
types (`sqlite3_adapter.rb:123`): `boolean: {name: "boolean"}`,
`json: {name: "json"}`, `datetime: {name: "datetime"}`, `binary: {name: "blob"}`.

**MySQL** (`abstract_mysql_adapter.rb`) — width-precise text/blob/int families:

```ruby
m.register_type %r(tinytext)i,   Type::Text.new(limit: 2**8  - 1)
m.register_type %r(text)i,       Type::Text.new(limit: 2**16 - 1)
m.register_type %r(mediumtext)i, Type::Text.new(limit: 2**24 - 1)
m.register_type %r(longtext)i,   Type::Text.new(limit: 2**32 - 1)
# ... matching *blob types ...
m.register_type %r(^float)i,     Type::Float.new(limit: 24)
m.register_type %r(^double)i,    Type::Float.new(limit: 53)

register_integer_type m, %r(^bigint)i,    limit: 8
register_integer_type m, %r(^int)i,       limit: 4
register_integer_type m, %r(^mediumint)i, limit: 3
register_integer_type m, %r(^smallint)i,  limit: 2
register_integer_type m, %r(^tinyint)i,   limit: 1

m.alias_type %r(year)i, "integer"
m.alias_type %r(bit)i,  "binary"
# AbstractAdapter's %r(int)i matches POINT/MULTIPOINT; override so they aren't integers.
m.register_type %r(^(?:point|multipoint))i, Type::Value.new
```

`register_integer_type` checks for `\bunsigned\b` in the SQL type and picks
`Type::UnsignedInteger`. The `point`/`multipoint` line is a live example of
regex shadowing needing a deliberate fix.

**PostgreSQL** (`postgresql_adapter.rb:770-825`) — keyed on **type names that are
resolved to OIDs**, not on the declared column text:

```ruby
m.register_type "int2", Type::Integer.new(limit: 2)
m.register_type "int4", Type::Integer.new(limit: 4)
m.register_type "int8", Type::Integer.new(limit: 8)
m.register_type "bool",  Type::Boolean.new
m.register_type "json",  Type::Json.new
m.register_type "jsonb", OID::Jsonb.new          # subclass of Type::Json, type == :jsonb
m.register_type "uuid",  OID::Uuid.new
m.register_type "bytea", OID::Bytea.new
m.register_type "hstore", OID::Hstore.new
m.register_type "inet", OID::Inet.new    # ... cidr, macaddr, xml, tsvector, citext, ltree,
                                         #     point, line, lseg, box, path, polygon, circle
m.register_type "numeric" do |_, fmod, sql_type| ... end
m.register_type "interval" do |*args, sql_type| ... end
```

And Postgres does two things the other two do not:

1. **`lookup_cast_type` resolves a name through the server.**
   `super(query_value("SELECT #{quote(sql_type)}::regtype::oid").to_i)` — the
   type map's real keys are OIDs; the string form is a convenience.
2. **The map is extended at runtime from the catalog.** `load_additional_types`
   queries `pg_type`/`pg_range` for unknown OIDs and feeds them to
   `OID::TypeMapInitializer`, so user-defined enums, domains and ranges get
   types without any Rails-side registration. An OID that still cannot be
   resolved calls `register_unknown_oid_type`, which **warns** and registers
   `Type.default_value` (String) — degrade, don't crash.

`OID::Jsonb` is thirteen lines: subclass `Type::Json`, override `type` to return
`:jsonb`. The behavior is entirely inherited. A Hey design should copy that:
`jsonb` is `json` with a different name.

---

## 6. End-to-end trace: text in SQLite → a real boolean / Hash / Time

This is the question the whole design turns on, so here it is step by step for a
SQLite table.

```sql
CREATE TABLE lessons (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  published boolean DEFAULT 0 NOT NULL,
  payload json,
  created_at datetime(6) NOT NULL
);
```

**Step 1 — introspect.** `SchemaStatements#columns(table_name)`
(`abstract/schema_statements.rb:113`):

```ruby
def columns(table_name)
  fetch_column_definitions(...).to_h do |table, definitions|
    [table, definitions.map { |field| new_column_from_field(table, field, definitions) }]
  end
end
```

SQLite's `column_definitions` is an alias for `table_structure`
(`sqlite3_adapter.rb:630`), which runs `PRAGMA table_xinfo(...)` (falling back to
`table_info` when virtual columns aren't supported) and then re-reads the
original `CREATE TABLE` text out of `sqlite_master` to recover `COLLATE`,
`AUTOINCREMENT` and `GENERATED ALWAYS AS`, which the pragma does not report.

**Step 2 — resolve a type per column.** `new_column_from_field`
(`sqlite3/schema_statements.rb`):

```ruby
Column.new(
  field["name"],
  lookup_cast_type(field["type"]),      # <- the cast type, the important argument
  extract_value_from_default(field["dflt_value"]),
  fetch_type_metadata(field["type"]),
  field["notnull"].to_i == 0,
  default_function,
  collation:, auto_increment:, rowid:, generated_type:)
```

`field["type"]` is the literal declared string — `"boolean"`, `"json"`,
`"datetime(6)"`. `lookup_cast_type` → `type_map.lookup(sql_type)` → the regex
map from §5.5/§5.6. `"boolean"` matches `%r(boolean)i` → `Type::Boolean`.
`"json"` matches `%r(^json)i` → `Type::Json`. `"datetime(6)"` matches the
extended map's `%r(\A[^\(]*datetime)i` → `Type::DateTime.new(precision: 6, timezone: :utc)`.
The resulting `Column` carries `cast_type` as a first-class reader
(`connection_adapters/column.rb:9`).

The model's attribute types come from this — `ActiveRecord::ModelSchema` builds
`attribute_types` from `columns_hash`, so `Lesson.type_for_attribute(:payload)`
is the same `Type::Json` instance.

**Step 3 — read a row.** The driver returns storage-class values. For
`published` SQLite hands back integer `1`; for `payload` the TEXT
`'{"a":1}'`; for `created_at` the TEXT `'2026-09-07 12:00:00.123456'`.

**Step 4 — wrap, don't convert.** Each raw value is wrapped as
`ActiveModel::Attribute.from_database(name, raw_value, type)`
(`activemodel/lib/active_model/attribute.rb:8`). Nothing is converted yet — the
raw value is kept in `value_before_type_cast`. This laziness matters: a
`SELECT *` of 10 000 rows does not parse 10 000 JSON documents unless you read
the attribute.

**Step 5 — deserialize on read.** `Attribute#value` memoizes
`type_cast(value_before_type_cast)`, and for the `FromDatabase` subclass
(`attribute.rb:181`):

```ruby
class FromDatabase < Attribute
  def type_cast(value)
    type.deserialize(value)      # <- deserialize, NOT cast
  end
end

class FromUser < Attribute
  def type_cast(value)
    type.cast(value)             # <- cast, NOT deserialize
  end
  private def _value_for_database
    Type::SerializeCastValue.serialize(type, value)
  end
end
```

**That single line is the answer to the trace.** The read path calls
`deserialize`; the write path calls `cast` then `serialize`. Two different
methods on the same type object, selected by *where the value came from*, and
the provenance is carried by the attribute class rather than sniffed from the
value.

So:

| Column | Raw from SQLite | `deserialize` | Result |
| --- | --- | --- | --- |
| `published` | `1` (Integer) | `Boolean#cast_value` — `1 ∉ FALSE_VALUES` | `true` |
| `payload` | `'{"a":1}'` (String) | `Json#deserialize` — `ActiveSupport::JSON.decode` | `{"a" => 1}` |
| `created_at` | `'2026-09-07 12:00:00.123456'` | `DateTime#cast_value` — `fast_string_to_time` | `Time` (UTC, 6-digit precision) |

**Step 6 — write back.** `record.published = true` builds a
`FromUser` attribute; on save, `value_for_database` runs `serialize`
(`Boolean#serialize` = `cast` → `true`), the value becomes a bind, and
`type_casted_binds` → `type_cast(true)` → SQLite's `unquoted_true` → `1`.
`record.payload = {"a" => 1}` → `Json#serialize` → the string `'{"a":1}'` → bound
as TEXT. The round trip is closed, and the *only* place that knows SQLite stores
booleans as integers is `unquoted_true`.

---

## 7. What Rails does when a backend lacks a feature

There is no single rule. Rails picks per case, and the choice is explicit and
visible in the source. Four distinct strategies, with real examples:

### 7.1 Emulate — rewrite the operation in terms of primitives the backend has

SQLite's `ALTER TABLE` cannot change a column's type, its default, or its
nullability. Rails implements `change_column`, `change_column_default`,
`change_column_null`, `rename_column` and `remove_column` by **rebuilding the
table** (`sqlite3_adapter.rb:393-457`, `675-810`): `alter_table` → `copy_table`
creates a new table with the desired definition, `copy_table_indexes` recreates
indexes, `copy_table_contents` moves the rows with an `INSERT ... SELECT`, then
the old table is dropped and the new one renamed. The migration author writes the
same `change_column` on every backend.

Same strategy for referential integrity, three different mechanisms:

| Backend | `disable_referential_integrity` |
| --- | --- |
| PostgreSQL | `SET session_replication_role = replica` (or disabling triggers) |
| MySQL | `SET FOREIGN_KEY_CHECKS = 0`, restored in `ensure` |
| SQLite | `PRAGMA defer_foreign_keys = ON` + `PRAGMA foreign_keys = OFF`, both restored in `ensure` |

### 7.2 Branch on a capability predicate — one shared caller, adapter-owned SQL

`build_insert_sql` is `raise NotImplementedError` on the base class and each
adapter writes its own. SQLite's (`sqlite3_adapter.rb`):

```ruby
sql << " ON CONFLICT #{insert.conflict_target} DO NOTHING"        if insert.skip_duplicates?
sql << " ON CONFLICT #{insert.conflict_target} DO UPDATE SET ..." if insert.update_duplicates?
sql << " RETURNING #{insert.returning}"                           if insert.returning
```

MySQL's writes `ON DUPLICATE KEY UPDATE` instead, and has no conflict target
(`supports_insert_conflict_target?` is false), and until MariaDB no `RETURNING`
(`supports_insert_returning?`). The caller — `ActiveRecord::InsertAll` — asks
the predicates and refuses combinations the backend cannot express, rather than
emitting SQL that will fail at the server.

### 7.3 Degrade with a warning — keep going with a weaker type

Postgres, on a result column whose OID it cannot resolve even after querying
`pg_type` (`postgresql_adapter.rb`):

```ruby
def register_unknown_oid_type(oid, column_name)
  warn "unknown OID #{oid}: failed to recognize type of '#{column_name}'. It will be treated as String."
  Type.default_value.tap { |cast_type| type_map.register_type(oid, cast_type) }
end
```

Same instinct in `TypeMap#lookup`: an unmatched SQL type yields
`Type.default_value` rather than raising. Rails treats "I don't know this type"
as a reason to pass the value through untouched, never as a reason to fail the
query.

### 7.4 Raise — loudly, naming the adapter

- `abstract/schema_statements.rb:1650`, `:1660`, `:1667`, `:1674`:
  `raise NotImplementedError, "#{self.class} does not support changing table comments"`
  — and the same for column comments, enabling indexes, disabling indexes.
- `Quoting#quote` and `#type_cast` both end in
  `raise TypeError, "can't quote/cast #{value.class.name}"`. No `to_s` fallback.
- `SQLite3Adapter#check_version` refuses to run at all against SQLite < 3.35.0.
- `AdapterSpecificRegistry` raises `TypeConflictError` when a type registered
  for all adapters would shadow an adapter-native type of the same name — a
  *registration-time* refusal, not a runtime one.

**The pattern.** Rails emulates when the operation has a faithful equivalent;
branches on a predicate when the SQL differs but the intent survives; degrades
when the worst case is a weaker but still-correct value; and raises when
continuing would silently produce a wrong answer. hey_record already has the
right instinct here — `HeyRecordDialect.named` refuses unknown dialects, with
`tools/dialect_refusal_probe.hey` as a negative test that `bin/package-check`
requires to exit non-zero. That is exactly the discipline the type layer needs.

---

## 8. Type family matrix

What each backend actually stores and returns, and what the deserializer must
do. "Returns (Hey today)" is what the *current* hey drivers hand back, verified
from their source in §2.

| Family | SQLite stores | SQLite returns (Hey today) | Postgres stores | Postgres returns (text proto) | MySQL stores | MySQL returns (Hey today) | Deserializer must |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **boolean** | INTEGER 1/0 (declared `boolean`; NUMERIC affinity) | `integer` 1/0 | `bool` | `"t"` / `"f"` | `TINYINT(1)` | `'1'` / `'0'` **string** | false-list: `false, 0, "0", "f", "F", "false", "FALSE", "off", "OFF"` → false; `""` → nil; everything else → true |
| **integer** | INTEGER (8 bytes) | `integer` | `int2/int4/int8` | `"42"` | `INT`/`BIGINT`/… | `'42'` **string** | pass integers through; `Text.parse_int` on strings; refuse non-numeric; carry `limit` for range checks |
| **float / double** | REAL | `float` | `float4/float8` | `"1.5"` | `FLOAT`/`DOUBLE` | `'1.5'` **string** | pass floats through; parse strings; handle `NaN`/`Infinity` (PG emits `NaN`, `Infinity`) |
| **decimal / numeric** | NUMERIC (stored as REAL or INTEGER — **lossy**) | `float` or `integer` | `numeric` (exact) | `"1.50"` | `DECIMAL` (exact) | `'1.50'` **string** | keep the *string* + `scale`; `Text.parse_fixed(value, scale)`. Never route through float. SQLite cannot store exact decimals — document the loss. |
| **string / varchar** | TEXT | `text` | `varchar`/`text` | text | `VARCHAR` | string | identity; enforce `limit` on serialize only if you choose to |
| **text / clob** | TEXT | `text` | `text` | text | `TEXT`/`LONGTEXT` | string | identity |
| **binary / blob** | BLOB | `bytes` | `bytea` | hex-escaped `\x…` (text proto) | `BLOB` | string (**lossy today**) | SQLite: identity. PG: decode `\x` hex. MySQL: hey_mysql refuses binary *binds* today and returns blobs through `column_text` — both are gaps, see §10. |
| **date** | TEXT `YYYY-MM-DD` (declared `date`) | `text` | `date` | `"2026-09-07"` | `DATE` | `'2026-09-07'` | parse fixed-width to `{year, month, day}`; `''`/`0000-00-00` → nil |
| **time** | TEXT `HH:MM:SS[.ffffff]` | `text` | `time` | `"12:00:00"` | `TIME` | `'12:00:00'` | parse to a time-of-day record; Rails normalizes the date part to `2000-01-01` so comparisons work |
| **datetime / timestamp** | TEXT `YYYY-MM-DD HH:MM:SS[.ffffff]` | `text` | `timestamp`/`timestamptz` | `"2026-09-07 12:00:00.123456+00"` | `DATETIME`/`TIMESTAMP` | same as text | parse to a canonical instant; apply declared precision; treat `0000-00-00 00:00:00` as nil; **apply the connection's timezone policy, not the type's** |
| **json** | TEXT (declared `json`) | `text` | `json` | text | `JSON` (≥5.7.8, not MariaDB) | string | `Json.decode` **on strings only**; pass non-strings through; a decode failure is a typed error, not a crash |
| **jsonb** | n/a — declare `json` | `text` | `jsonb` | text | n/a | n/a | identical to `json`; only the reported type name differs (`OID::Jsonb` is a 13-line subclass) |
| **uuid** | TEXT | `text` | `uuid` | `"…-…"` | `CHAR(36)`/`BINARY(16)` | string | normalize to canonical lowercase hyphenated form; refuse malformed |
| **array** | n/a | n/a | `type[]` | `"{1,2,3}"` | n/a | n/a | PG only. Parse the brace-delimited literal, then deserialize each element with the element type. Refuse on other dialects at *plan* time. |
| **interval** | n/a | n/a | `interval` | `"1 day"` / ISO-8601 | n/a | n/a | PG only. **This is failure (3)**: `make_interval` has no SQLite equivalent. |
| **unknown** | anything | as stored | anything | text | anything | string | identity pass-through + a recorded warning. Never raise, never guess. |

Three conclusions fall out of this table:

1. **MySQL is the hardest backend for hey_record today**, not Postgres. Every
   value is a string. Without a schema-driven type map, `SELECT count(*)`
   returns `'17'` and `row.count + 1` is a string concatenation or a type error.
2. **Postgres' text protocol is not the easy case either.** `bool` arrives as
   `"t"`, which is truthy in almost any naive check — the same class of bug as
   failure (1), with a different literal.
3. **SQLite is the only backend that returns typed scalars**, and that is
   exactly why the boolean bug hid: integers came back correctly typed as
   integers, so nothing looked broken until someone wrote `x == true`.

---

## 9. Proposed Hey API

Design rules, taken from the existing packages: modules with `fn`, plain
records, no nil across a public boundary, `Result` with typed error codes, no
type annotations in user code, no regex, functions-as-record-fields for the
adapter seam.

### 9.1 `hey_record/type.hey` — `HeyType`

A type is a plain record carrying three callables. This mirrors the
connection-record pattern the package already uses, so the compiled lane treats
it the same way.

```hey
# Type record shape
# {
#   kind: 'hey_record_type',
#   name: 'boolean',              # logical family
#   sql_name: 'boolean',          # what create_table should emit for this dialect
#   options: {limit: -1, precision: -1, scale: -1},
#   cast: <fn(type, value) -> Result>,
#   deserialize: <fn(type, value) -> Result>,
#   serialize: <fn(type, value) -> Result>
# }

module HeyType
  # --- constructors ---
  fn boolean()
  fn integer(options)          # options.limit  (bytes)
  fn float(options)            # options.limit  (bits: 24 | 53)
  fn decimal(options)          # options.precision, options.scale
  fn string(options)           # options.limit
  fn text(options)
  fn binary(options)
  fn date()
  fn time(options)             # options.precision
  fn datetime(options)         # options.precision
  fn json()
  fn jsonb()                   # json behavior, name 'jsonb'
  fn uuid()
  fn array(element_type)
  fn value()                   # identity / unknown

  # --- the three operations (the whole point of this package) ---
  fn cast(type, value)         # user input  -> Hey value      Result
  fn deserialize(type, value)  # database    -> Hey value      Result
  fn serialize(type, value)    # Hey value   -> bind value     Result

  # --- introspection ---
  fn name(type)
  fn options(type)
  fn known?(type)              # false for HeyType.value()
end
```

**Defaults that must be written out, not assumed:**

- `deserialize` defaults to `cast` (matching `ActiveModel::Type::Value`), but
  `json`, `jsonb`, `binary` (PG), `array` and `decimal` **must** override it.
- `serialize` defaults to identity, but `boolean`, `json`, `jsonb`, `datetime`,
  `date`, `time`, `decimal` and `array` **must** override it.
- Every one returns a `Result`. A JSON decode failure is
  `Result.error_value('type_deserialize_failed', ..., {type: 'json', column: ..., raw: ...})`,
  never a crash and never a silent nil. This is the one place I deliberately
  diverge from Rails, which rescues `JSON::ParserError` and returns `nil` after
  reporting — a Result is strictly more informative and matches package
  convention.

`HeyType.boolean()`'s `deserialize` uses the Rails false-list verbatim:

```hey
# false when value is any of: false, 0, '0', 'f', 'F', 'false', 'FALSE', 'off', 'OFF'
# nil   when value is ''
# true  otherwise
```

This is the single change that fixes failure (1) on all three backends at once.

### 9.2 `hey_record/type_map.hey` — `HeyTypeMap`

Rails keys on `Regexp`; Hey has none. Substitute a **normalized-token matcher**:
lowercase the declared SQL type, split off any `(...)` metadata, and match the
remaining token by one of three rules.

```hey
# Map record
# {kind: 'hey_record_type_map', parent: <map or nil-sentinel>, entries: [...]}
#
# Entry record
# {match: 'exact' | 'prefix' | 'contains', token: 'tinyint(1)', build: <fn(sql_type, meta) -> type>}

module HeyTypeMap
  fn empty()
  fn child(parent)
  fn register(map, match, token, build)     # returns a NEW map (records are immutable)
  fn register_type(map, match, token, type) # convenience: constant type
  fn alias_type(map, match, token, target_token)   # re-lookup carrying (...) metadata
  fn lookup(map, sql_type)                  # -> Result(type); miss -> Result.ok(HeyType.value())
  fn lookup_strict(map, sql_type)           # -> Result; miss -> typed error 'type_unknown_sql_type'

  fn base()                                 # the AbstractAdapter-equivalent registrations
  fn for_dialect(dialect, options)          # base + per-dialect overrides + runtime options
end
```

`lookup` must resolve **last registration wins** (Rails' `reverse_each`) so
`for_dialect` overrides `base` without deleting entries. Match precedence within
one map: `exact` > longest `prefix` > longest `contains`. That deterministic
ordering replaces Rails' "reverse registration order" and is easier to reason
about than regex shadowing — it makes the MySQL `point`/`multipoint` accident
structurally impossible.

`for_dialect(dialect, options)` is the `extended_type_map` equivalent. Its
`options` carries the runtime knobs:

```hey
{timezone: 'utc', emulate_booleans: true, strict: false}
```

- `emulate_booleans: true` (mysql) registers `exact 'tinyint(1)'` → boolean.
- `timezone` is threaded into the `datetime`/`time` constructors.
- `strict: true` makes `lookup` refuse unknown SQL types instead of returning
  `HeyType.value()`. Off by default (Rails' degrade-don't-crash), on in
  `bin/package-check` receipts so a new unmapped type is caught in CI.

### 9.3 `hey_record/schema.hey` — `HeyRecordSchema`

```hey
# Column record
# {
#   kind: 'hey_record_column',
#   name: 'published',
#   sql_type: 'boolean',
#   type: <HeyType record>,
#   null: false,
#   default: 0,
#   default_function: '',
#   primary_key: false
# }

module HeyRecordSchema
  fn columns(connection, table)        # -> Result([column])
  fn column_types(connection, table)   # -> Result({column_name: type})
  fn column(connection, table, name)   # -> Result(column) | 'schema_column_missing'
  fn table_exists?(connection, table)  # -> boolean

  # Explicit, caller-owned cache. hey_record holds no global state.
  fn cache()                           # -> {kind: 'hey_record_schema_cache', tables: {}}
  fn cached_types(cache, connection, table)   # -> Result({cache, types})
  fn invalidate(cache, table)
end
```

`columns` is the `SchemaStatements#columns` equivalent:

1. call the adapter's `column_definitions` (§9.6) for raw catalog rows,
2. build the dialect type map once,
3. `HeyTypeMap.lookup(map, row.sql_type)` per column,
4. return column records.

The cache is a value threaded by the caller, not a mutable global — same
decision the store made with connections. `HeyRecordModel.define` is the natural
place to hold one.

### 9.4 `hey_record/row.hey` — `HeyRecordRow`

```hey
module HeyRecordRow
  fn deserialize(types, row)                # -> Result(row)
  fn deserialize_all(types, rows)           # -> Result([row])
  fn serialize(types, attributes)           # -> Result(attributes)
  fn serialize_parameters(types, names, parameters)  # positional binds
end
```

`deserialize` walks the row's keys; a key with no entry in `types` is passed
through unchanged (a computed column, a `count(*)`, a joined column from another
table). A key whose deserializer errors returns a typed error naming the column:

```
Result.error_value('row_deserialize_failed',
  "column 'payload' (json): invalid JSON",
  {column: 'payload', type: 'json', raw: <the raw value>})
```

That error message alone would have collapsed failure (2) from "worker crashes
on its first job" to a one-line diagnosis.

### 9.5 Changes to existing hey_record modules

**`dialect.hey`** — the dialect record grows a quoting/type descriptor. Current
shape (verbatim from the source) is
`{name, identifier_quote, auto_increment, boolean_true, boolean_false}`.
Proposed:

```hey
{
  name: 'sqlite3',
  identifier_quote: '"',
  auto_increment: 'AUTOINCREMENT',

  # Quoting — split the way Rails splits it
  quoted_true: 'TRUE',      quoted_false: 'FALSE',      # SQL literal text
  unquoted_true: 1,         unquoted_false: 0,          # bind parameter value
  binary_literal: 'hex_x',                              # x'..' | pg_bytea | hex_0x
  string_escape: 'double_single_quote',

  # Native DDL type names (NATIVE_DATABASE_TYPES equivalent)
  native_types: {
    primary_key: 'integer PRIMARY KEY AUTOINCREMENT NOT NULL',
    string: 'varchar', text: 'text', integer: 'integer', float: 'float',
    decimal: 'decimal', datetime: 'datetime', time: 'time', date: 'date',
    binary: 'blob', boolean: 'boolean', json: 'json'
  },

  # Type-map overrides layered on HeyTypeMap.base()
  type_overrides: [...],

  # Capability defaults; a live connection's capabilities() overrides these
  supports: {json: true, returning: true, upsert: true, arrays: false, intervals: false}
}
```

Keeping `boolean_true`/`boolean_false` as deprecated aliases of
`quoted_true`/`quoted_false` avoids breaking `sql.hey`'s existing
`hey_record_literal_value` in the same change.

Add `HeyRecordDialect.postgres()` and extend `named()` to accept `'postgres'`
(and `'postgresql'`) — currently `named()` refuses anything but `sqlite3` and
`mysql`, so hey_postgres cannot be used with the store or the ledger at all
today, independent of types.

**`sql.hey`** — `hey_record_literal_value` uses `dialect.quoted_true` /
`dialect.quoted_false`, and gains an `else` that **refuses** an unhandled value
kind rather than falling through to `"'" + ('' + value) + "'"`. The current
final line stringifies records and arrays into SQL literals; that is the
mechanism by which a Hey map becomes the text `'{...}'` in a column. Mirror
Rails' `raise TypeError`:

```hey
return Result.error_value('sql_unquotable_value', 'cannot render value of type ' + type(value) + ' as a SQL literal', {...})
```

The plan builders (`insert_plan`, `update_plan`, `conditions_plan`) gain an
optional `types` argument; when present, every parameter goes through
`HeyType.serialize` before it lands in `plan.parameters`.

**`dataset.hey`** — the dataset record gains `types: {}` and
`schema_cache: <cache>`. `HeyRecord.all` / `first` deserialize before returning;
`insert` / `update` / `where` serialize. Both are no-ops when `types` is empty,
so **every existing caller keeps working unchanged** and opts in with a new
`HeyRecord.typed(dataset)` (or `HeyRecord.from_typed(connection, table)`) that
populates `types` from `HeyRecordSchema`.

**`model.hey`** — `HeyRecordModel.define` gains `options.types` (an explicit
map, for callers who don't want introspection) and holds the schema cache.

**`migration.hey`** — `HeyRecordMigration.column(name, sql_type, options)`
accepts a *logical* family name (`'boolean'`, `'json'`, `'datetime'`) and
resolves it through `dialect.native_types`, so one migration emits `boolean` on
SQLite, `jsonb` on Postgres and `TINYINT(1)` on MySQL. A raw SQL type string
stays accepted verbatim for escape-hatch cases.

**`main.hey`** — `HeyRecordInfo.capabilities()` gains
`dialects: ['sqlite3', 'mysql', 'postgres']`, `type_map: true`,
`schema_introspection: true`.

### 9.6 What each adapter package must expose

This is the new adapter contract. Everything here is **additive** — the existing
`query`/`query_params`/`execute`/`execute_params`/`begin`/`commit`/`rollback`/`close`
callables and the `dialect` field are unchanged, so hey_record can detect the new
surface with `has(connection, 'column_definitions')` exactly the way
`dataset.hey` already probes for `query_params`.

| Contract item | Kind | Purpose |
| --- | --- | --- |
| `dialect` | field | exists today |
| `adapter` | field | exists today |
| `column_definitions` | **new** callable `fn(connection, table) -> Result([raw])` | catalog rows for one table |
| `native_column_type` | **new** callable `fn(connection, raw_row) -> Result(sql_type_string)` | pull the declared type out of a backend-shaped catalog row |
| `result_column_types` | **new** *optional* callable `fn(connection, result) -> Result([sql_type])` | per-result-set types, for ad-hoc SQL with no table to introspect |
| `cast_bound_value` | **new** *optional* callable `fn(connection, value) -> Result(value)` | the MySQL `"1"`-not-`1` hazard |
| `capabilities()` | extend existing module fn | add the SQL-surface `supports_*` keys |
| `server_version()` | **new** module fn `-> Result(string)` | version-gated capabilities (`supports_json?` on MySQL) |

Raw catalog rows stay backend-shaped; `native_column_type` is the adapter's job
because only the adapter knows whether the column is called `type`, `Type`,
`data_type` or `format_type(atttypid, atttypmod)`.

**`hey_sqlite3` must add:**

- `Sqlite3.column_definitions(connection, table)` — `PRAGMA table_info(<t>)`
  (or `table_xinfo` when available) returning `[{name, type, notnull, dflt_value, pk}]`,
  refusing a missing table as `sqlite3_table_missing`.
- `Sqlite3.native_column_type(connection, row)` → `row.type` (the **declared**
  type text). Explicitly do *not* consult storage affinity — Rails doesn't, and
  the declared string is the only place `boolean` and `json` survive.
- `Sqlite3.result_column_types(connection, result)` — optional; SQLite's
  `sqlite3_column_decltype` is available on the native side and would let
  ad-hoc `SELECT` results be typed. Nice-to-have, not required.
- `capabilities()` keys: `json: true`, `returning: true` (already proven by
  `specs/returning_spec.hey`), `upsert: true`, `arrays: false`,
  `intervals: false`, `set_config: false`, `ddl_transactions: true`,
  `exact_decimal: false`.
- Bindings need **no change** — `bind_value` already does the right thing for
  `boolean`, `integer`, `float`, `bytes` and `nil`. The `'' + value` fallback
  becomes unreachable for known types once `serialize` runs first, and should
  additionally be changed to a typed refusal for records/arrays.

**`hey_mysql` must add:**

- `Mysql.column_definitions(connection, table)` — `SHOW FULL COLUMNS FROM <t>`
  or an `information_schema.columns` query, returning
  `[{name, type, null, key, default, extra, collation}]` where `type` is the
  full declared string including `tinyint(1)` and `unsigned`.
- `Mysql.native_column_type(connection, row)` → `row.type`.
- `Mysql.server_version(connection)` and `Mysql.mariadb?(connection)` —
  `supports_json` is `!mariadb && version >= 5.7.8` and cannot be a constant.
- `Mysql.cast_bound_value(connection, value)` — booleans to `'1'`/`'0'`
  (already the behavior of `hey_mysql_literal_value`; promote it to the
  contract).
- **The big one, and it belongs in this package**: expose per-column field
  types. `hey_mysql_row_value` calls `MysqlNative.column_text` for *every*
  column, so integers, floats and dates all arrive as strings. Either wrap
  `mysql_fetch_field_direct` to expose `enum_field_types` and add a
  `MysqlNative.column_value` that mirrors `Sqlite3Native.column_value`, **or**
  accept text-for-everything and rely entirely on hey_record's schema-driven
  deserialize. The second is cheaper and works for table-backed queries; the
  first is required for ad-hoc SQL where there is no table to introspect. I
  recommend doing the second now and the first as a follow-on — but write the
  limitation into `README.md` either way, because right now an application
  reading MySQL through hey_record gets strings and doesn't know it.
- `capabilities()` keys: `json` (version-gated), `returning: false`,
  `upsert: true` (`ON DUPLICATE KEY UPDATE`), `arrays: false`,
  `intervals: false`, `ddl_transactions: false`, `exact_decimal: true`.

**`hey_postgres` — add to `PACKAGE_SPEC.md` before implementation:**

- `Postgres.column_definitions(connection, table)` querying `pg_attribute` +
  `pg_type` and returning `{name, sql_type (format_type), oid, fmod, notnull, default, collation}`.
- `Postgres.native_column_type(connection, row)` → `row.sql_type`.
- `Postgres.result_column_types(connection, result)` — the spec **already**
  wraps `PQftype` and `PQfmod`; this is the function that surfaces them per
  result set, and it is the reason Postgres can type ad-hoc SQL that SQLite and
  MySQL cannot.
- A documented **OID → logical type table** in the package (16→bool, 23→int4,
  20→int8, 21→int2, 700→float4, 701→float8, 1700→numeric, 25→text,
  1043→varchar, 114→json, 3802→jsonb, 2950→uuid, 17→bytea, 1082→date,
  1083→time, 1114→timestamp, 1184→timestamptz, 1186→interval). Rails also
  resolves *unknown* OIDs at runtime from `pg_type`; that is a later slice —
  ship the well-known table first and treat an unknown OID as `text` **with a
  recorded warning**, exactly like `register_unknown_oid_type`.
- **Reconsider `Postgres.Row`'s per-call accessors.** The spec's
  `text/int/bool/json/timestamp` accessors put the type decision at every call
  site, which is the design that produced failure (1). Keep them as an
  escape hatch; make the schema-driven path the default.
- `capabilities()`: `json: true`, `jsonb: true`, `arrays: true`,
  `intervals: true`, `returning: true`, `upsert: true`,
  `ddl_transactions: true`, `exact_decimal: true`, `set_config: true`.

### 9.7 The dialect-function problem (failure 3)

Types do not fix `set_config` / `make_interval` / `to_timestamp` reaching
SQLite. Two additions, both in `hey_record`:

1. **A capability gate.** `HeyRecordDialect.supports?(dialect, feature)` plus a
   live override from the connection's `capabilities()`. Shared code asks before
   it emits.
2. **A named-function surface.** `HeyRecordSql.function(dialect, name, arguments)`
   emits the dialect's spelling of a portable function and **refuses** with
   `sql_function_unsupported` when the dialect has none. `now`, `coalesce`,
   `greatest`/`least` (hey_sqlite3 already ships PostgreSQL-semantics
   `greatest`/`least` as native SQLite scalar functions — see its README),
   `json_get`, `cast`, `concat`. `make_interval` and `set_config` are *not*
   portable and must refuse loudly on sqlite3/mysql.

Model the negative test on the existing `tools/dialect_refusal_probe.hey`: a
probe that asks for a Postgres-only function on a sqlite3 dialect and must exit
non-zero.

---

## 10. Which changes belong where

### `hey_record` — all policy

| Change | New/edit |
| --- | --- |
| `type.hey` — `HeyType`, all families, cast/deserialize/serialize | new |
| `type_map.hey` — `HeyTypeMap`, token matcher, `base()`, `for_dialect()` | new |
| `schema.hey` — `HeyRecordSchema`, columns/column_types/cache | new |
| `row.hey` — `HeyRecordRow`, row-level (de)serialization | new |
| `dialect.hey` — quoted/unquoted true/false, `native_types`, `supports`, `postgres()`, `named('postgres')` | edit |
| `sql.hey` — literal uses `quoted_*`; refuse unquotable values; plans serialize through types; `HeyRecordSql.function` | edit |
| `dataset.hey` — carry `types`, deserialize reads, serialize writes, `HeyRecord.typed` | edit |
| `model.hey` — hold the schema cache, accept explicit types | edit |
| `migration.hey` — logical type names resolved via `dialect.native_types` | edit |
| `main.hey` — capabilities | edit |
| `specs/` — type round-trip specs per family per dialect; a **boolean regression spec** that fails if `true` round-trips as anything but `true` | new |
| `tools/` — a type-refusal probe, mirroring `dialect_refusal_probe.hey` | new |

### `hey_sqlite3` — introspection + capabilities only

`column_definitions`, `native_column_type`, extended `capabilities()`, optional
`result_column_types` via `sqlite3_column_decltype`, and turning
`bind_value`'s `'' + value` fallback into a typed refusal for records/arrays.
No type logic. **No native rebuild required** for the required items — `PRAGMA
table_info` runs through the existing `query` path.

### `hey_mysql` — introspection, version, and the text-protocol decision

`column_definitions` (`SHOW FULL COLUMNS`), `native_column_type`,
`server_version`, `mariadb?`, `cast_bound_value`, extended `capabilities()`.
Then the decision in §9.6 about `column_text`-for-everything. Also worth
recording as a known limit: no prepared statements means bound values are
escaped and interpolated, so `serialize` output must be a value
`hey_mysql_literal_value` can render — which today excludes `bytes`
(`mysql_binary_parameter_unsupported`).

### `hey_postgres` — spec changes now, implementation later

`PACKAGE_SPEC.md` gains `column_definitions`, `native_column_type`,
`result_column_types`, the well-known OID table, `capabilities()`, and a
statement that the schema-driven path is the default and `Postgres.Row`'s typed
accessors are an escape hatch. Nothing to build yet; but writing it down now
stops the package being built with the same gap.

### Ordering (each step independently shippable)

1. `HeyType` + `HeyTypeMap` + specs. Pure functions, no adapter changes, no
   behavior change to existing callers.
2. `dialect.hey` quoting split + `sql.hey` refusal. Fixes the literal path.
3. `column_definitions` in hey_sqlite3, then `HeyRecordSchema`, then
   `HeyRecord.typed`. **This is the step that closes failures (1) and (2)** on
   SQLite.
4. `column_definitions` in hey_mysql; the MySQL text-protocol decision.
5. `HeyRecordSql.function` + capability gates. Closes failure (3).
6. `HeyRecordDialect.postgres()`; hey_postgres spec update.

---

## 11. Sources

All Rails links pinned to `e970c80fd668f3f4ee08201bbbbcadfb2f29b1df`
(`main`, `RAILS_VERSION` 8.2.0.alpha), except where a tag is named.

Adapter contract and capabilities
- <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/abstract_adapter.rb>
- <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/abstract/schema_statements.rb>
- <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/abstract/database_statements.rb>

Quoting
- <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/abstract/quoting.rb>
- <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/sqlite3/quoting.rb>
- <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/postgresql/quoting.rb>
- <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/mysql/quoting.rb>

Boolean-representation history
- Rails 4.2 abstract `quoted_true` = `"'t'"`: <https://github.com/rails/rails/blob/v4.2.11.3/activerecord/lib/active_record/connection_adapters/abstract/quoting.rb#L66-L80>
- Rails 5.2 `represent_boolean_as_integer`: <https://github.com/rails/rails/blob/v5.2.8.1/activerecord/lib/active_record/connection_adapters/sqlite3/quoting.rb#L32-L46> and <https://github.com/rails/rails/blob/v5.2.8.1/activerecord/lib/active_record/connection_adapters/sqlite3_adapter.rb#L80-L92>
- Rails 6.0, integers only: <https://github.com/rails/rails/blob/v6.0.6.1/activerecord/lib/active_record/connection_adapters/sqlite3/quoting.rb#L32-L46>

Types
- `ActiveModel::Type::Value`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activemodel/lib/active_model/type/value.rb>
- `ActiveModel::Type::Boolean`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activemodel/lib/active_model/type/boolean.rb>
- `ActiveModel::Type::DateTime`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activemodel/lib/active_model/type/date_time.rb>
- `ActiveModel::Type::Helpers::TimeValue`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activemodel/lib/active_model/type/helpers/time_value.rb>
- `ActiveRecord::Type::Json`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/type/json.rb>
- `ActiveRecord::Type::Serialized`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/type/serialized.rb>
- `ActiveRecord::Type::TypeMap`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/type/type_map.rb>
- `AdapterSpecificRegistry`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/type/adapter_specific_registry.rb>
- `ActiveModel::Attribute` (`FromDatabase#type_cast` → `deserialize`, `FromUser#type_cast` → `cast`): <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activemodel/lib/active_model/attribute.rb>

Adapter type maps and introspection
- SQLite3 adapter (`SQLite3Integer`, `TYPE_MAP`, `table_structure`, `alter_table`/`copy_table`, `check_version`, `build_insert_sql`): <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/sqlite3_adapter.rb>
- SQLite3 `new_column_from_field`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/sqlite3/schema_statements.rb>
- SQLite3 `Column`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/sqlite3/column.rb>
- MySQL abstract adapter (`emulate_booleans`, `extended_type_map`, `initialize_type_map`, `disable_referential_integrity`): <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/abstract_mysql_adapter.rb>
- Mysql2 adapter (`supports_json?` version gate): <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/mysql2_adapter.rb>
- PostgreSQL adapter (`initialize_type_map`, `get_oid_type`, `load_additional_types`, `register_unknown_oid_type`): <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/postgresql_adapter.rb>
- PostgreSQL `new_column_from_field` / `fetch_type_metadata`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/postgresql/schema_statements.rb>
- `OID::Jsonb`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/postgresql/oid/jsonb.rb>
- `ConnectionAdapters::Column`: <https://github.com/rails/rails/blob/e970c80fd668f3f4ee08201bbbbcadfb2f29b1df/activerecord/lib/active_record/connection_adapters/column.rb>

Backend documentation
- SQLite storage classes and affinity: <https://www.sqlite.org/datatype3.html>
- SQLite `sqlite3_column_decltype`: <https://www.sqlite.org/c3ref/column_decltype.html>
- SQLite `PRAGMA table_info` / `table_xinfo`: <https://www.sqlite.org/pragma.html#pragma_table_info>
- MySQL `BOOL`/`BOOLEAN` = `TINYINT(1)`: <https://dev.mysql.com/doc/refman/8.4/en/numeric-type-syntax.html>
- PostgreSQL boolean output is `t`/`f`: <https://www.postgresql.org/docs/current/datatype-boolean.html>
- libpq `PQftype`/`PQfmod`: <https://www.postgresql.org/docs/current/libpq-exec.html>

Hey packages (read at the paths below on 2026-09-07)
- `~/dev/hey_record` 0.3.0 — `dialect.hey`, `sql.hey`, `dataset.hey`, `store.hey`, `migrate.hey`, `migration.hey`, `model.hey`, `main.hey`, `docs/DESIGN.md`
- `~/dev/hey_sqlite3` 0.3.4 — `adapter.hey`, `Native.hey`, `README.md`
- `~/dev/hey_mysql` 0.3.1 — `adapter.hey`, `native.hey`
- `~/dev/hey_postgres` — `PACKAGE_SPEC.md`, `BUILDER_START_HERE.md`, `README.md`
- `~/dev/hey-lang-bootstrap-plan/stdlib` — module inventory; `Text.hey`, `Time.hey`, `Json.hey` surfaces

---

## 12. Flagged — what I could not verify

1. **Which Rails release moved the abstract `quoted_true` from `'t'` to
   `TRUE`.** I verified the endpoints (4.2 = `'t'`, current `main` = `"TRUE"`)
   but did not bisect the intermediate releases or find the PR. The 5.2→6.0
   SQLite-specific migration *is* verified from the tagged sources.
2. **Whether SQLite ≥ 3.23 is genuinely the version that introduced the
   `TRUE`/`FALSE` keywords.** I inferred it from Rails' current behavior plus
   the `check_version` floor of 3.35.0; I did not read the SQLite changelog.
   The conclusion (SQLite stores 1/0) does not depend on it.
3. **The exact `pg_type` OID numbers listed in §9.6.** They are well-known and
   stable, but I did not read them out of a live `pg_catalog` or out of
   `pg_type.h` in this session. Verify against `pg_type.dat` before writing them
   into `hey_postgres`.
4. **Whether `MysqlNative` can be extended to expose field types without a
   native rebuild.** `native.hey` wraps `field_name`, `column_text`,
   `column_bytes`, `column_length` and `column_is_null`, but not
   `mysql_fetch_field_direct`. Adding it looks like a C change plus a rebuild;
   I did not read `native/` to confirm the ABI surface.
5. **How `hey_sqlite3`'s native layer reports `sqlite3_column_decltype`.**
   `Sqlite3Native` exposes `column_type` (storage class) but no `decltype`.
   Adding it is likely a native change; unverified.
6. **Whether the Hey compiled lane handles a record whose fields are function
   values inside a *nested* record.** The connection record proves the flat
   case works. `HeyType` records carry three callables and would be nested
   inside a `types` map inside a dataset record. Given the compiler history
   documented in `store.hey`'s comment (a `-> boxed` annotation that was
   load-bearing until 0.99.497a, and a `HeyRecordModel.find` that still does not
   lower), **prove this with a compiled-lane receipt before building on it.**
   An alternative that avoids the question entirely: make types plain
   `{name, options}` records and dispatch on `name` inside `HeyType.cast` /
   `deserialize` / `serialize` with an if-ladder. Less elegant, no closures in
   records, and it matches how `dialect.hey` already works. **I recommend the
   if-ladder for the first slice.**
7. **`stdlib:Time` has no parser** — verified by reading its module surface
   (`now_ns`, `unix_ms`, `utc_iso8601`, `utc_iso8601_at`, `elapsed_ns`,
   `ns_to_ms`, `rows_per_second`). I did not check whether some other stdlib
   module (`Duration`, `Codec`) offers date parsing. Check before writing an
   ISO-8601 parser by hand.
8. **Rails' `SerializeCastValue` fast path** (`Type::SerializeCastValue.serialize`
   in `FromUser#_value_for_database`) — an optimization that lets a type skip
   re-casting an already-cast value. I read the call sites but not the module.
   It does not change the three-operation model.
