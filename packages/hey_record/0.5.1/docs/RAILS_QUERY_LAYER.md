# Growing hey_record into a real query layer

**What this document is.** A source-verified study of how ActiveRecord/Arel build SQL, and a
concrete proposal for the equivalent in `hey_record`. It is research and design only: no `.hey`
source was modified to write it.

**Companion document.** `docs/RAILS_ADAPTER_ARCHITECTURE.md` (written separately) covers the
type/quoting layer -- attribute types, cast-to-database, per-adapter quoting rules. This document
assumes that layer exists and refers to it as "the type layer" where the two meet.

---

## 0. The gap, measured

### What `hey_record` 0.3.0 actually is

| File | Lines | What it holds |
|---|---|---|
| `model.hey` | 49 | `define / dataset / all / where / find / create / update / destroy` |
| `dataset.hey` | 174 | connection dispatch, `transaction`, and an immutable dataset record |
| `sql.hey` | 200 | identifier quoting, literal escaping, and four plan builders |
| `dialect.hey` | 24 | three descriptors: `identifier_quote`, `auto_increment`, `boolean_true/false` |
| `store.hey` | 326 | JSON record store (not part of this proposal) |
| `migrate.hey` / `migration.hey` | 234 / 73 | ledger + DDL helpers (not part of this proposal) |

The query layer is `dataset.hey` + `sql.hey` + `dialect.hey` = **398 lines**, and its entire
expressive range is:

```hey
HeyRecord.from(conn, table)
  |> select(columns)        # bare column names only
  |> where(criteria)        # a record; keys AND'd; value = scalar | nil | array
  |> order(column, dir) | order_raw(expr)
  |> limit(n) |> offset(n)
```

`HeyRecordSql.conditions_plan` (sql.hey) is the whole predicate language. Reading it directly:
a `nil` value becomes `IS NULL`, an array becomes `IN (?, ?, ...)`, an empty array becomes `1 = 0`,
everything else becomes `= ?`, and the conditions are joined with `' AND '`. There is no `OR`, no
`NOT`, no comparison other than equality, no join, no group, no having, no aggregate, no upsert,
no lock, and no way to bind a value anywhere except a `WHERE` right-hand side. `select_plan`
concatenates six string fragments in a fixed order.

`dialect.hey` carries **three** facts about a backend. That is enough to quote an identifier and
spell a boolean. It is not enough to decide anything about grammar.

### What the adapters are

| Package | Version | Placeholder | Binding mechanism | RETURNING |
|---|---|---|---|---|
| `hey_sqlite3` | 0.3.4 | `?` | real prepared statements (`sqlite3_prepare` + `bind_all`) | yes -- `specs/returning_spec.hey` proves `execute_params` collects `RETURNING` rows |
| `hey_mysql` | 0.3.1 | `?` | **client-side interpolation**: `hey_mysql_interpolate_value` splices escaped literals into the SQL text; `capabilities()` reports `prepared_statements: false, parameter_binding: 'connector-c-escape'` | no |
| `hey_postgres` | spec only | `$1..$n` | `PQexecParams` (per `PACKAGE_SPEC.md`) | yes |

Both shipped adapters already return the same `hey_record_connection` record -- `dialect` plus the
callables `query`, `query_params`, `execute`, `execute_params`, `begin`, `commit`, `rollback`,
`close` -- and both already expose a `capabilities()` record. **That capability record is the seam
this whole proposal hangs on**, and §9 says what has to go into it.

Note the three-way placeholder split. This is not hypothetical: MMeow's vendored `hey_record@0.4.1`
already ships `pg.hey`, whose `hey_record_pg_renumber_value` walks the SQL text character by
character rewriting `?` into `$n`, with this admission in its own header comment:

> Hand-written SQL containing a literal `'?'` inside a string is out of scope here -- bind such
> values instead of embedding them.

That caveat is the entire argument for an AST in one sentence. A tree knows which `?` is a
placeholder because placeholders are *nodes*; a string does not, and can only guess.

### What the consuming application is doing instead

Measured in `/Users/jthomas/dev/MMeow`:

| | Count |
|---|---|
| `src/db/statements.hey` | **1,398 lines**, 140 hand-written statements |
| `ON CONFLICT` upserts | **37** (32 `DO UPDATE`, 5 `DO NOTHING`) |
| `RETURNING` clauses | **74** |
| statements with a `JOIN` | **12** |
| `FOR UPDATE SKIP LOCKED` | 2 (the outbox claim and the stale-claim reaper) |
| `src/db/sqlite_dialect.hey` -- the PostgreSQL-to-SQLite translator | **776 lines** |

The translator's own header states the design honestly:

> THE INVARIANT THAT MATTERS MOST: translation never reaches inside a SQL string literal. `'now()'`
> as data and `now()` as a function call are the same seven characters, and a naive replace rewrites
> the former into a timestamp. That would corrupt DATA while leaving syntactically valid SQL, so no
> amount of "does it parse / does it run" testing would catch it.

It solves that with a same-length character mask so every rule searches the mask and slices the
original. That is a lexer. Having built a lexer, the file then implements eleven rewrite rules
(`strip_casts`, `strip_locking`, `rewrite_extract`, `rewrite_interval`, `rewrite_timezone`,
`rewrite_date_cast`, `rewrite_greatest`, `rewrite_now`, `rewrite_any`, `rewrite_overlap`,
`rewrite_json_exists`, `qualify_schemas`) and finally `rewrite_placeholders` -- the `$n`-to-`?`
renumbering. Its comments record the bugs this class of design produces:

- `::interval` must **not** be stripped, because dropping it turned
  `now() + ($2 || ' seconds')::interval` into numeric addition, giving every session
  `expires_at = 1211626` so `expires_at > now()` was always false and **login silently never
  authenticated**.
- `EXTRACT(EPOCH FROM ...)` had to be matched case-insensitively because one lowercase call site
  in `worker_runtime.hey` passed untranslated PostgreSQL to SQLite while the coverage gate still
  reported zero residuals.
- `make_interval` had to handle `-` as well as `+`, because handling only `+` left the
  stale-claim reaper untranslated and SQLite refused to prepare it.
- An earlier segment-based design could not see `$2 = ANY(COALESCE(o.error_signatures,'{}'))`
  because the parentheses straddled a literal.

Every one of those is a bug that cannot exist if the query is a tree. You do not "fail to strip a
cast" from a tree; there is either a cast node or there isn't. You do not "miss a lowercase
EXTRACT"; there is either an `extract_epoch` node or there isn't. You do not renumber placeholders;
you render them once, in order, from `bind_param` nodes.

**This is the thesis of the document: the 776-line translator is a SQL parser that MMeow was forced
to write because `hey_record` hands it strings. Replace the strings with a tree and the translator
becomes a visitor -- and most of it stops existing.**

---

## 1. Arel: why Rails builds an AST

### 1.1 The claim, in Rails' own words

`activerecord/lib/arel/nodes/node.rb` carries the design thesis in its docstring:

> The intermediate representation allows Arel to compile the statement into the database's specific
> SQL dialect only before sending it without having to care about the nuances of each database when
> building the statement. It also allows easier composition of statements without having to resort
> to (brittle and unsafe) string manipulation.

Source: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/nodes/node.rb>

### 1.2 The node taxonomy

`activerecord/lib/arel/nodes.rb` is a pure require-manifest, and its comment headers *are* the
taxonomy: `# node`, `# terminal`, `# unary`, `# binary`, `# nary (And and Or)`, `# function`,
`# windows`, `# conditional expressions`, `# joins`, then `comment`, `sql_literal`,
`bound_sql_literal`, `casted`.

| Category | Representative members |
|---|---|
| Unary (`expr`) | `Bin, Cube, DistinctOn, Group, GroupingElement, GroupingSet, Lateral, Limit, Lock, Not, Offset, On, OptimizerHints, RollUp`; subclasses `Grouping, Ordering, Ascending, Descending, NullsFirst, NullsLast, With, HomogeneousIn` |
| Binary (`left`, `right`) | `As, Between, GreaterThan(OrEqual), LessThan(OrEqual), IsDistinctFrom, IsNotDistinctFrom, NotEqual, NotIn, Equality, In, Assignment, Join, Union, Intersect, Except, JoinSource, TableAlias, Matches, Regexp, Cte` |
| Nary | `Nary` with `children`; `And = Class.new(Nary)`, `Or = Class.new(Nary)` |
| InfixOperation | `Multiplication(:*), Division(:/), Addition(:+), Subtraction(:-), Concat(:"||"), Contains(:"@>"), Overlaps(:"&&")` |
| Function | `Sum, Exists, Max, Min, Avg, Count, Extract, NamedFunction, ValuesList` |
| Statements | `SelectStatement` (holds `cores`, `limit`, `orders`, `lock`, `offset`, `with`), `SelectCore` (holds `projections, wheres, groups, havings, windows, source, set_quantifier`), `InsertStatement`, `UpdateStatement`, `DeleteStatement` |
| Joins | `InnerJoin, OuterJoin, FullOuterJoin, RightOuterJoin, StringJoin, LeadingJoin` |
| Terminal | `Distinct, True, False` |
| Values | `Casted, Quoted, BindParam, SqlLiteral, BoundSqlLiteral` |

Two shapes matter more than the rest for this proposal:

- **`SelectCore` keeps `projections`, `wheres`, `groups`, `havings`, `windows` as five separate
  arrays.** Clause ordering is not encoded in the data; it lives in exactly one place, the visitor
  method that emits a core. Adding a `WHERE` to an existing query is an array push, not a search for
  the word `WHERE` followed by a decision about whether to write `AND`.
- **`SqlLiteral < String`** -- literally a String subclass. The escape hatch is a *type*, so a
  literal can be spliced wherever a string can, and the visitor can still tell it apart from a
  string that arrived by accident (see §1.4).

### 1.3 Visitor dispatch

`activerecord/lib/arel/visitors/visitor.rb` -- the whole mechanism is about 35 lines.

```ruby
def self.dispatch_cache
  @dispatch_cache ||= Hash.new do |hash, klass|
    hash[klass] = :"visit_#{(klass.name || "").gsub("::", "_")}"
  end.compare_by_identity
end

def visit(object, collector = nil)
  dispatch_method = dispatch[object.class]
  if collector
    send dispatch_method, object, collector
  else
    send dispatch_method, object
  end
rescue NoMethodError => e
  raise e if respond_to?(dispatch_method, true)
  superklass = object.class.ancestors.find { |klass|
    respond_to?(dispatch[klass], true)
  }
  raise(TypeError, "Cannot visit #{object.class}") unless superklass
  dispatch[object.class] = dispatch[superklass]
  retry
end
```

Three properties worth stealing:

1. **Dispatch is a table keyed by node identity, cached per visitor class.** `SelectStatement` maps
   to `:visit_Arel_Nodes_SelectStatement`.
2. **Inheritance fallback is lazy and self-healing.** There is no
   `visit_Arel_Nodes_Multiplication`; the first visit raises, the rescue finds
   `InfixOperation` in the ancestor chain, *rewrites the cache entry*, and retries. Every later
   visit is a direct hit.
3. **An unknown node is a loud failure**: `raise(TypeError, "Cannot visit #{object.class}")`.

Every `visit_*` method takes `(o, collector)` and **returns the collector**, so they chain:
`visit(o.expr, collector) << ")"`. Entry is:

```ruby
def compile(node, collector = Arel::Collectors::SQLString.new)
  accept(node, collector).value
end
```

### 1.4 The injection barrier is a dispatch-table entry

`arel/visitors/to_sql.rb` defines a second error and wires fourteen raw Ruby classes to it:

```ruby
class UnsupportedVisitError < StandardError
  def initialize(object)
    super "Unsupported argument type: #{object.class.name}. Construct an Arel node instead."
  end
end

def unsupported(o, collector)
  raise UnsupportedVisitError.new(o)
end

alias :visit_String  :unsupported
alias :visit_Hash    :unsupported
alias :visit_Symbol  :unsupported
alias :visit_Date    :unsupported
alias :visit_Time    :unsupported
# ... BigDecimal, Class, DateTime, Float, NilClass, TrueClass, FalseClass,
#     ActiveSupport::Multibyte::Chars, ActiveSupport::StringInquirer
```

A bare `String` in the tree cannot silently become SQL -- it hits `visit_String` and raises. This is
a **security property implemented purely by dispatch-table registration**, and it is the single
cheapest thing on this list to copy.

### 1.5 One tree, several dialects

Only three dialect visitors exist (plus `Dot`, a Graphviz renderer over the same tree, which proves
the tree is not SQL-specific). Selection is one adapter hook: `AbstractAdapter#arel_visitor` returns
`Arel::Visitors::ToSql.new(self)`; PostgreSQL/SQLite/MySQL adapters return their own subclass.

The same node renders differently per backend. Concrete cases, all verified in source:

| Node | PostgreSQL | MySQL | SQLite |
|---|---|---|---|
| `Concat` (`InfixOperation :"\|\|"`) | `a \|\| b` | `CONCAT(a, b)` -- because `\|\|` is OR under MySQL's default `sql_mode` | `a \|\| b` |
| `Matches` (`case_sensitive` flag) | `LIKE` / **`ILIKE`** (+ `ESCAPE`) | `LIKE` (base class) | `LIKE` (base class) |
| `Regexp` | `~` / `~*` | `REGEXP` / `NOT REGEXP` | not supported in base |
| `IsNotDistinctFrom` | `IS NOT DISTINCT FROM` | `<=>` | `IS` |
| `NullsFirst` | native | emulated as `expr IS NOT NULL, expr` | -- |
| `DistinctOn` | `DISTINCT ON ( expr )` | base raises `NotImplementedError, "DISTINCT ON not implemented for this db"` | same |
| `Lock` | `visit o.expr` (emits the literal) | inherits base | **`def visit_Arel_Nodes_Lock(o, collector); collector; end`** -- comment: `# Locks are not supported in SQLite` |
| offset with no limit | native `OFFSET` | `o.limit = Limit.new(18446744073709551615)` -- with the comment `###\n# :'(` | `o.limit = Limit.new(-1)` |
| `SELECT` with no `FROM` | fine | `o.froms ||= Arel.sql("DUAL")` | fine |

Note what the last three rows are: **dialect fixups performed as tree rewrites immediately before
rendering**, not as string surgery afterwards. MySQL's `build_subselect` goes further and constructs
an entire new `SelectStatement` wrapping the old one in a `Grouping ... AS "__active_record_temp"`;
PostgreSQL's `prepare_update_statement` clones the statement, aliases the relation, and pushes new
`key.eq(...)` predicates onto `stmt.wheres`. Neither is expressible as string manipulation without
a SQL parser -- which is exactly the parser MMeow had to write.

Sources:
<https://github.com/rails/rails/blob/main/activerecord/lib/arel/visitors/to_sql.rb>,
<https://github.com/rails/rails/blob/main/activerecord/lib/arel/visitors/sqlite.rb>,
<https://github.com/rails/rails/blob/main/activerecord/lib/arel/visitors/mysql.rb>,
<https://github.com/rails/rails/blob/main/activerecord/lib/arel/visitors/postgresql.rb>

### 1.6 Precedence is a tree property, not a rendering rule

`Nodes::Node#or` does **not** return an `Or`. It returns
`Nodes::Grouping.new(Nodes::Or.new([self, right]))`. The parentheses are inserted *structurally, at
construction time*, so `a.or(b).and(c)` cannot mis-associate. `#and` returns a bare `And`, safe
because `AND` binds tighter. The visitors are then trivially dumb -- `inject_join o.children,
collector, " AND "` -- and `visit_Arel_Nodes_Grouping` collapses redundant nesting so you never get
`((x))`:

```ruby
def visit_Arel_Nodes_Grouping(o, collector)
  if o.expr.is_a? Nodes::Grouping
    visit(o.expr, collector)
  else
    collector << "("
    visit(o.expr, collector) << ")"
  end
end
```

`grouping_parentheses(o, collector, always_wrap_selects = true)` consults
`require_parentheses?(o)` -> `!o.orders.empty? || o.limit || o.offset`, i.e. it parenthesizes
precisely when a subquery has clauses that would otherwise bind to the outer query. That is a
semantic judgment made against the tree, unavailable to a string concatenator.

---

## 2. Bind parameters: where `$1` and `?` come from

This is the mechanism `hey_record` needs most urgently, because it has three adapters with two
placeholder syntaxes and one adapter with no real binding at all.

Rails splits the problem along two independent axes.

### Axis 1 -- the placeholder *format*, owned by the visitor

`arel/visitors/to_sql.rb`:

```ruby
BIND_BLOCK = ActiveSupport::Ractors.shareable_proc { "?" }
private_constant :BIND_BLOCK
def bind_block; BIND_BLOCK; end

def visit_Arel_Nodes_BindParam(o, collector)
  collector.add_bind(o.value, &bind_block)
end
```

`arel/visitors/postgresql.rb`:

```ruby
BIND_BLOCK = ActiveSupport::Ractors.shareable_proc { |i| "$#{i}" }
private_constant :BIND_BLOCK
def bind_block; BIND_BLOCK; end
```

That is the whole of PostgreSQL's `$n` support. MySQL and SQLite define no `bind_block` and inherit
`"?"`. The base block takes no argument and ignores the index; PG's takes it. (It is a `proc`, not a
`lambda`, precisely so the arity mismatch is tolerated.)

### Axis 2 -- the placeholder *count*, owned by the collector

`arel/collectors/sql_string.rb`:

```ruby
class SQLString < PlainString
  attr_accessor :preparable, :retryable

  def initialize(*)
    super
    @bind_index = 1
  end

  def add_bind(bind, &)
    self << yield(@bind_index)
    @bind_index += 1
    self
  end

  def add_binds(binds, proc_for_binds = nil, &block)
    self << (@bind_index...@bind_index += binds.size).map(&block).join(", ")
    self
  end
end
```

`SQLString` **discards the bind value entirely** and appends whatever the block returns for index
`n`. `Arel::Collectors::Bind` is the mirror image: `def <<(str); self; end` throws away all SQL text
and keeps only the values.

### Putting them together

`AbstractAdapter#collector` -- defined exactly once, overridden by **no adapter**:

```ruby
def collector
  if prepared_statements
    Arel::Collectors::Composite.new(
      Arel::Collectors::SQLString.new,
      Arel::Collectors::Bind.new,
    )
  else
    Arel::Collectors::SubstituteBinds.new(
      self,
      Arel::Collectors::SQLString.new,
    )
  end
end
```

`Composite` tees every call to both halves and returns `[sql, binds]`. `SubstituteBinds` ignores the
block entirely and inlines quoted values:

```ruby
def add_bind(bind, &)
  bind = bind.value_for_database if bind.respond_to?(:value_for_database)
  self << quoter.quote(bind)
end
```

**So: the `$` sigil is supplied by the visitor; the number is supplied by the collector's
`@bind_index`; and whether placeholders appear at all is chosen by the adapter's collector. Nothing
in Rails ever renumbers a placeholder, because nothing ever produces a placeholder it then has to
re-derive.**

The payoff shows up in `to_sql_and_binds` (`abstract/database_statements.rb`): if a rendered query
has more binds than `bind_params_length` (SQLite3 caps at 999), Rails re-renders **the same tree**
under `unprepared_statement`, i.e. through `SubstituteBinds`. Same AST, different collector,
different SQL. That fallback is only possible because rendering is a separate pass.

Two side-channels ride *up* out of the visit on the collector: `preparable` (set false by
`visit_Arel_Nodes_SqlLiteral`, `HomogeneousIn`, and array-valued `In`/`NotIn`) and `retryable` (set
false by update/delete statements and `NamedFunction`, narrowed by `collector.retryable &&=
o.retryable` for `Arel.sql(..., retryable: true)`).

Sources:
<https://github.com/rails/rails/blob/main/activerecord/lib/arel/collectors/sql_string.rb>,
<https://github.com/rails/rails/blob/main/activerecord/lib/arel/collectors/substitute_binds.rb>,
<https://github.com/rails/rails/blob/main/activerecord/lib/arel/collectors/bind.rb>,
<https://github.com/rails/rails/blob/main/activerecord/lib/active_record/connection_adapters/abstract_adapter.rb>

### Why this matters for `hey_record` specifically

`hey_mysql` does not have prepared statements. It has `hey_mysql_interpolate_value`, which is
structurally `Arel::Collectors::SubstituteBinds` -- a quoter that inlines escaped values -- except
that it operates on finished SQL text and therefore has to count `?` characters and can miscount:
it raises `mysql_bind_count_mismatch` in both directions. Under the collector design, MySQL's
"substitute" collector never sees a `?` at all; it receives bind *nodes* and emits quoted text
directly, and a count mismatch becomes structurally impossible.

---

## 3. Proposed Hey shape: nodes, visitors, collectors

Design constraints taken from the existing code and `docs/developers/13-language-reference.md`:

- Values are immutable; `[...a, x]` and `{...r, k: v}` are the update forms. So **collectors are
  threaded, not mutated** -- each emit returns a new collector. This is *already* how Arel works
  (every `visit_*` returns the collector), so the port is natural rather than forced.
- Functions are callable values storable in records (`hey_sqlite3` already ships a connection record
  of callables). So **a visitor is a record of callables keyed by node kind** -- Arel's dispatch
  cache, without needing reflection.
- There is no pattern-matching form. A dispatch record beats an `if/else` chain on `node.kind` both
  for readability and because "is this node kind handled by this backend?" becomes `has(visitor,
  key)` -- a first-class question.
- `?`-suffixed module functions returning `Result` records mislower on the current trunk
  (`docs/DESIGN.md`), and `HeyRecord.first` currently collides with the collections builtin `first`
  in the compiled lane (`todos.md` item 2). **Node and visitor function names must be checked
  against builtins before they are chosen**; see §10.

### 3.1 Nodes -- `ast.hey`

A node is a plain record with a `kind` tag. Constructors validate; nothing else does.

```hey
module HeyRecordAst
  # --- leaves -------------------------------------------------------------
  fn column(name)                  # {kind: 'column', name: 'o.objective_id'}
  fn table(name, alias_name = '')  # {kind: 'table', name: ..., alias: ...}
  fn bind(value)                   # {kind: 'bind', value: value}
  fn literal_value(value)          # {kind: 'literal', value: value}   -- inlined, quoted
  fn raw(sql)                      # {kind: 'raw', sql: sql}           -- the escape hatch, §8
  fn star()                        # {kind: 'star'}

  # --- predicates ---------------------------------------------------------
  fn equal(left, right)            fn not_equal(left, right)
  fn less(left, right)             fn less_or_equal(left, right)
  fn greater(left, right)          fn greater_or_equal(left, right)
  fn is_null(expr)                 fn is_not_null(expr)
  fn in_list(expr, items)          fn not_in_list(expr, items)
  fn between(expr, low, high)
  fn matches(expr, pattern, case_sensitive)   # LIKE / ILIKE -- see the table in §1.5
  fn conjunction(children)         # AND -- nary
  fn disjunction(children)         # OR  -- nary, ALWAYS wrapped in grouping()
  fn negation(expr)
  fn grouping(expr)

  # --- expressions --------------------------------------------------------
  fn function_call(name, args, distinct)   # count/sum/avg/min/max/coalesce/greatest
  fn infix(operator, left, right)
  fn case_when(branches, otherwise)
  fn cast(expr, type_name)         # a NODE, not text -- see §3.5
  fn aliased(expr, name)

  # --- clauses / statements ----------------------------------------------
  fn join(kind, relation, on_expr) # kind: 'inner' | 'left' | 'right' | 'full' | 'cross'
  fn ordering(expr, direction, nulls)   # nulls: '' | 'first' | 'last'
  fn select_statement(core, orders, limit, offset, lock)
  fn select_core(projections, source, joins, wheres, groups, havings, distinct)
  fn insert_statement(table, columns, rows, conflict, returning)
  fn update_statement(table, assignments, wheres, returning)
  fn delete_statement(table, wheres, returning)
end
```

`disjunction` must wrap itself:

```hey
fn disjunction(children)
  return {kind: 'grouping', expr: {kind: 'or', children: children}}
end
```

This is Arel's `Node#or` rule, and it is the reason precedence never has to be reasoned about at
render time.

### 3.2 The collector -- `collector.hey`

Three collector constructors, matching Rails' three modes exactly.

```hey
module HeyRecordCollector
  # SQL text + ordered bind values. `placeholder` is the dialect's format function.
  fn binding(placeholder)
    return {kind: 'collector_binding', sql: '', parameters: [], bind_index: 1, placeholder: placeholder}
  end

  # SQL text only; values are quoted and inlined by `quoter`. This is the
  # hey_mysql mode, and the DDL/debug mode.
  fn substituting(quoter)
    return {kind: 'collector_substituting', sql: '', parameters: [], quoter: quoter}
  end

  fn text(collector, fragment)          # -> collector'
  fn bind_value(collector, value)       # -> collector'
  fn bind_values(collector, values)     # -> collector'   (the IN-list fast path)
  fn plan(collector)                    # -> {kind: 'hey_record_sql_plan', sql, parameters}
end
```

`bind_value` on a binding collector is Arel's `SQLString#add_bind`, transliterated:

```hey
fn bind_value(collector, value)
  if collector.kind == 'collector_substituting'
    let quote = collector.quoter
    return {...collector, sql: collector.sql + quote(value)}
  end
  let format = collector.placeholder
  return {
    ...collector,
    sql: collector.sql + format(collector.bind_index),
    parameters: [...collector.parameters, value],
    bind_index: collector.bind_index + 1
  }
end
```

And the placeholder formats live on the dialect, one line each:

```hey
# dialect.hey
fn sqlite3_placeholder(index)   return '?' end
fn mysql_placeholder(index)     return '?' end
fn postgres_placeholder(index)  return '$' + index end
```

`hey_record_pg_renumber_value` in `pg.hey` deletes itself the day this lands. So does
`SqliteDialect.rewrite_placeholders` in MMeow.

**Returning `{sql, parameters}` from `plan` keeps the existing `hey_record_sql_plan` shape**, so
`HeyRecord.query_plan` / `execute_plan` and every adapter keep working unchanged. The AST is
additive under the existing plan contract; that is what makes §10's staging possible.

### 3.3 The visitor -- `visitor.hey` plus one file per dialect

```hey
module HeyRecordVisit
  # Render one node into a collector. Returns the new collector.
  fn node(visitor, node, collector)
    if type(node) != 'object' or has(node, 'kind') == false
      fail 'hey_record: cannot visit a non-node value; wrap it with HeyRecordAst.bind() or .raw()'
    end
    let key = 'emit_' + node.kind
    if has(visitor, key) == false
      fail 'hey_record: dialect ' + visitor.dialect + ' cannot emit node: ' + node.kind
    end
    let emit = visitor[key]
    return emit(visitor, node, collector)
  end

  fn nodes(visitor, list, collector, separator)  # inject_join
  fn clause(visitor, list, collector, prefix, separator)  # collect_nodes_for
end
```

The `has(visitor, key) == false -> fail` branch is Arel's
`raise(TypeError, "Cannot visit #{object.class}")`, and the `type(node) != 'object'` branch is
Arel's `unsupported` alias table. Both are one line here because Hey records are already tagged.

A dialect visitor is then a record built by merging a base over a per-dialect override -- which is
exactly Ruby subclassing, spelled with `{...base, ...overrides}`:

```hey
# visitor_base.hey -- portable SQL, the ToSql equivalent
module HeyRecordVisitorBase
  fn make(dialect)
    return {
      dialect: dialect.name,
      quote_identifier: dialect.quote_identifier,
      placeholder: dialect.placeholder,
      emit_column: hey_record_emit_column_value,
      emit_bind: hey_record_emit_bind_value,
      emit_equal: hey_record_emit_equal_value,
      emit_and: hey_record_emit_and_value,
      emit_or: hey_record_emit_or_value,
      emit_select_statement: hey_record_emit_select_statement_value,
      ...
    }
  end
end

# visitor_sqlite3.hey
module HeyRecordVisitorSqlite3
  fn make(dialect)
    let base = HeyRecordVisitorBase.make(dialect)
    return {...base,
      # "Locks are not supported in SQLite" -- but LOUDLY, see §7.
      emit_lock: hey_record_sqlite3_emit_lock_value,
      # OFFSET with no LIMIT needs LIMIT -1.
      emit_select_statement: hey_record_sqlite3_emit_select_statement_value,
      emit_is_not_distinct_from: hey_record_sqlite3_emit_is_value,
      emit_upsert_clause: hey_record_sqlite3_emit_upsert_value
    }
  end
end
```

A dialect that **cannot** express a node simply does not define its key, and the visitor's own
`fail` reports it by name at the first call site. That is the `NotImplementedError, "DISTINCT ON not
implemented for this db"` pattern, generalized: capability is expressed by *presence in a dispatch
record*, and the error message is generated rather than hand-written.

### 3.4 What replaces MMeow's translator

| `sqlite_dialect.hey` rule | Becomes |
|---|---|
| `masked` / `lower_mask` / `balanced_end` / `split_top_minus` (the lexer, ~200 lines) | **deleted** -- there is no text to lex |
| `rewrite_placeholders` | `dialect.placeholder`, one line |
| `strip_casts` (with the `::interval` landmine) | `emit_cast` per dialect; SQLite's emits nothing for decorative casts and *has no key* for `interval`, so an interval cast fails loudly instead of becoming numeric addition |
| `strip_locking` | `emit_lock` -- see §7, where the proposal deliberately diverges from both Rails and MMeow |
| `rewrite_extract` (both the instant and difference forms) | `emit_function_call` for a canonical `epoch_seconds` / `epoch_between` node |
| `rewrite_interval`, `rewrite_interval_cast` | `emit_infix` over an `interval_seconds` node |
| `rewrite_now`, `rewrite_timezone`, `rewrite_date_cast` | `emit_function_call` for `now`, `to_date` |
| `rewrite_greatest` | `emit_function_call` for `greatest` (SQLite: `MAX`; note `hey_sqlite3` already ships `specs/greatest_least_spec.hey`) |
| `rewrite_any`, `rewrite_overlap`, `rewrite_json_exists` | JSON/array nodes -- see §10, staged last; these stay raw SQL longest |
| `qualify_schemas` | a `dialect.resolve_table(name)` function: PostgreSQL emits `"ops"."outbox"`, SQLite emits `"ops.outbox"`. A *name mapping*, not a text rewrite -- and it cannot confuse `m.learner_id` for a schema-qualified name, because an alias reference is a different node |

### 3.5 A note on casts

MMeow's statements are dense with `$4::jsonb`, `$3::text[]`, `p::float8`, `$5::integer`. Those exist
because values reach `libpq` as text and need a target type. In the AST design a cast is a node
(`HeyRecordAst.cast(expr, 'jsonb')`), which means:

- The **type layer** (see `RAILS_ADAPTER_ARCHITECTURE.md`) decides how a Hey value is encoded for a
  given backend, and the cast node records the *intent* rather than the syntax.
- SQLite's visitor emits nothing for `jsonb`/`text[]`/`float8`/`integer` -- they are decorative in a
  dynamically-typed store -- and **has no key for `interval`**, so the exact construct that silently
  broke authentication becomes a startup-time refusal naming the node.

This is the single highest-value item in the table above, because it is the one whose failure mode
was silent data corruption rather than a query error.

---

## 4. `ActiveRecord::Relation` and the proposed relation API

### 4.1 How Rails composes lazily

A `Relation` is a bag of typed value slots plus a `spawn` (copy) on every chain link. The slot list
is declared once (`relation.rb`) and the accessors are generated from it:

```ruby
MULTI_VALUE_METHODS  = [:includes, :eager_load, :preload, :select, :group,
                        :order, :default_order, :joins, :left_outer_joins,
                        :references, :extending, :unscope, :optimizer_hints,
                        :annotate, :with].freeze
SINGLE_VALUE_METHODS = [:limit, :offset, :lock, :readonly, :reordering, :strict_loading,
                        :reverse_order, :distinct, :create_with, :skip_query_cache].freeze
CLAUSE_METHODS = [:where, :having, :from].freeze
VALUE_METHODS = (MULTI_VALUE_METHODS + SINGLE_VALUE_METHODS + CLAUSE_METHODS).freeze
```

Multi-value slots get `#{name}_values` defaulting to a frozen empty array; single-value slots get
`#{name}_value` defaulting to nil; clause slots get `#{name}_clause`. All state is one hash,
`@values`, and every writer calls `assert_modifiable!`, which raises
`ActiveRecord::UnmodifiableRelation` once `@loaded || @arel` -- i.e. **the relation freezes itself
the moment it has been rendered or loaded**. That is a property worth copying: it makes
"render, then keep chaining" a loud error instead of a stale-cache bug.

Public methods are non-bang and copy; bang methods mutate the copy:

```ruby
def where(*args)
  if args.empty?
    WhereChain.new(spawn)
  elsif args.length == 1 && args.first.blank?
    self
  else
    spawn.where!(*args)
  end
end
```

`where.not` is a small chain object that inverts the clause it builds:

```ruby
def not(opts, *rest)
  where_clause = @scope.send(:build_where_clause, opts, rest)
  @scope.where_clause += where_clause.invert
  @scope
end
```

`or` and `and` take a Relation and raise otherwise:
`"You have passed #{other.class.name} object to #or. Pass an ActiveRecord::Relation object
instead."` -- and then raise a *second* time if the two relations do not have identical structural
slots: `"Relation passed to #or must be structurally compatible. Incompatible values:
#{incompatible_values}"`. "Structural" is defined by subtraction:

```ruby
STRUCTURAL_VALUE_METHODS = (
  Relation::VALUE_METHODS -
  [:extending, :where, :having, :unscope, :references, :annotate, :optimizer_hints]
).freeze
```

So `joins`, `limit`, `group`, `select`, `distinct`, `lock` and `from` must match exactly; only the
predicate-ish slots may differ. This is the machinery that makes `Relation#or` expensive to build
and is the reason §4.2 proposes a narrower `or_where` instead.

Nothing has produced SQL yet. The tree is built once, at the end, in `build_arel`, whose ordering is
worth reading closely because it is the clause-assembly knowledge Rails keeps in exactly one place:

```ruby
def arel(aliases = nil)
  @arel ||= build_arel(aliases)
end

def build_arel(aliases)
  arel = Arel::SelectManager.new(table)

  build_joins(arel.join_sources, aliases)

  arel.where(where_clause.ast) unless where_clause.empty?
  arel.having(having_clause.ast) unless having_clause.empty?
  arel.take(build_cast_value("LIMIT", limit_value)) if limit_value
  arel.skip(build_cast_value("OFFSET", offset_value.to_i)) if offset_value
  arel.group(*arel_columns(group_values)) unless group_values.empty?

  build_order(arel)
  build_with(arel)
  build_select(arel)

  arel.optimizer_hints(*optimizer_hints_values) unless optimizer_hints_values.empty?
  arel.comment(*annotate_values) unless annotate_values.empty?
  arel.distinct(distinct_value)
  arel.from(build_from) unless from_clause.empty?
  arel.lock(lock_value) if lock_value

  arel
end
```

Source: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation/query_methods.rb>

Two details in there are easy to miss and both matter here:

- **`LIMIT` and `OFFSET` are bind parameters too.** `build_cast_value("LIMIT", limit_value)` wraps
  them in `ActiveModel::Attribute.with_cast_value`, so they render as `$n`/`?` like any other value.
  `hey_record` currently inlines them as integers, and `pg.hey`'s renumbering hack explicitly
  *depends* on that ("LIMIT/OFFSET are inlined integers; DDL carries no `?`"). Under the AST there
  is no reason to keep the exception.
- **Clause *ordering in SQL* is not decided by `build_arel` at all.** `build_arel` fills slots in
  whatever order is convenient; the emission order lives in `visit_Arel_Nodes_SelectCore`
  (SELECT / hints / DISTINCT / projections / FROM / WHERE / GROUP BY / HAVING / WINDOW) and
  `visit_Arel_Nodes_SelectOptions` (LIMIT / OFFSET / LOCK). One place, per dialect. That is exactly
  the knowledge `select_plan` currently hard-codes as six string concatenations.

The `SelectManager` methods it calls are thin -- each pushes a node into a named slot on the core:

```ruby
def where(expr);  @ctx.wheres << expr; self; end
def having(expr); @ctx.havings << expr; self; end
def group(*columns) ... @ctx.groups.push Nodes::Group.new column ... end
def project(*projections) ... @ctx.projections.concat ... end
def join(relation, klass = Nodes::InnerJoin) ... @ctx.source.right << create_join(...) ... end
def take(limit); @ast.limit = Nodes::Limit.new(limit); self; end
def skip(amount); @ast.offset = Nodes::Offset.new(amount); self; end
def lock(locking = Arel.sql("FOR UPDATE")) ... @ast.lock = Nodes::Lock.new(locking); self; end
```

Source: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/select_manager.rb>

Hash conditions become nodes through `PredicateBuilder`, and the rules are more interesting than
"nil becomes IS NULL":

| Value | Node built | Rendered |
|---|---|---|
| scalar | `Equality(attr, QueryAttribute)` | `col = ?` |
| `nil` | **also `Equality`** | `visit_Arel_Nodes_Equality` checks `right.nil?` and emits `col IS NULL`. The bind object itself answers `nil?` (`QueryAttribute#nil?` returns true when `value_before_type_cast.nil?`), so `where.not(name: nil)` symmetrically yields `IS NOT NULL` |
| 1-element array | `Equality` -- **not** a one-element `IN` | `col = ?` |
| n-element array | `HomogeneousIn(values, attr, :in)` -- one node holding all values, rendered via `add_binds` | `col IN (?, ?, ?)` |
| array containing nil | the above `OR`'d with `attr.eq(nil)`, wrapped in a `Grouping` | `(col IN (?,?) OR col IS NULL)` |
| `[]` | `In` with an empty array | literal `1=0`, and see below |
| `1..3` / `1...3` / `1..` / `..3` | `Predications#between` **chooses the node**: `Between`, `gteq.and(lt)`, `gteq`, `lteq` respectively; equal endpoints collapse to `eq`; unbounded collapses to `in([])` | -- |

The empty-array case is the one to steal outright. `WhereClause#contradiction?` recognizes both an
empty `In` and an `Equality` whose bind is `unboundable?`, and `exec_main_query` then returns
`[].freeze` **without issuing a query at all**. `hey_record`'s `conditions_plan` already emits
`1 = 0` for an empty array -- but it then sends that query to the database. Detecting the
contradiction on the tree and short-circuiting is free once the tree exists, and it is the kind of
thing you cannot do to a string without parsing it back.

`WhereClause#invert` has one subtlety worth mirroring: inverting a *single* predicate inverts the
node (`=` becomes `!=`), but inverting *several* wraps them: `where.not(name: "Jon", role: "admin")`
becomes `WHERE NOT (name = ? AND role = ?)`, not two negated predicates. Getting that wrong changes
results.

Sources: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation/predicate_builder.rb>,
<https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation/where_clause.rb>,
<https://github.com/rails/rails/blob/main/activerecord/lib/arel/predications.rb>

### 4.2 Proposed `hey_record` relation API

The existing dataset record grows typed slots and stays immutable. Every function takes the dataset
first and returns a new dataset, so the existing `{...dataset, key: value}` idiom and the receiver
call form (`dataset.where(...)`) both keep working.

```hey
module HeyRecord
  # --- source -------------------------------------------------------------
  fn from(connection, table)                    # unchanged signature
  fn alias_as(dataset, name)

  # --- projection ---------------------------------------------------------
  fn select(dataset, expressions)               # column names OR ast nodes
  fn select_append(dataset, expressions)
  fn distinct(dataset, enabled)

  # --- predicates ---------------------------------------------------------
  fn where(dataset, criteria)                   # record -> AND'd equality/in/null (unchanged meaning)
  fn where_node(dataset, node)                  # any predicate AST
  fn where_not(dataset, criteria)               # NOT (...)
  fn or_where(dataset, node)                    # OR against the accumulated clause
  fn rewhere(dataset, criteria)                 # replace, do not append
  fn unscope(dataset, slots)                    # slots: ['where', 'order', 'limit', ...]

  # --- joins --------------------------------------------------------------
  fn joins(dataset, relation, on_node)          # INNER
  fn left_joins(dataset, relation, on_node)     # LEFT OUTER
  fn joins_kind(dataset, kind, relation, on_node)

  # --- grouping -----------------------------------------------------------
  fn group(dataset, expressions)
  fn having(dataset, node)                      # REFUSES when group is empty -- see below

  # --- ordering and slicing ----------------------------------------------
  fn order(dataset, column, direction)          # unchanged
  fn order_node(dataset, ordering)              # HeyRecordAst.ordering(expr, dir, nulls)
  fn reorder(dataset, orderings)
  fn limit(dataset, count)                      # unchanged
  fn offset(dataset, count)                     # unchanged

  # --- locking ------------------------------------------------------------
  fn lock(dataset, mode)                        # mode: 'update' | 'update_skip_locked' |
                                                #       'update_nowait' | 'share' | 'none'

  # --- rendering ----------------------------------------------------------
  fn plan(dataset)                              # -> {kind:'hey_record_sql_plan', sql, parameters}
  fn sql(dataset)                               # unchanged
  fn parameters(dataset)                        # unchanged

  # --- execution (the only functions that touch the connection) -----------
  fn all(dataset)
  fn one(dataset)                               # NOT `first`: collides with a builtin (todos.md #2)
  fn each_row(dataset, work)
  fn pluck(dataset, columns)                    # -> Result of array of arrays
  fn exists?(dataset)                           # plain boolean, so the `?` name is safe

  # --- aggregates ---------------------------------------------------------
  fn count_rows(dataset)                        # NOT `count`; see §6 and §10 on name collisions
  fn count_distinct(dataset, column)
  fn aggregate(dataset, function_name, column)  # sum/avg/min/max, one code path
  fn grouped_counts(dataset)                    # a grouped dataset -> record keyed by group value
end
```

Deliberate differences from Rails, each with a reason:

- **`having` refuses without `group`.** Rails does *not* validate this -- verified: `having` only
  checks `opts.blank?`, `build_arel` emits `arel.having(...)` regardless of `group_values`, and
  there is no guard anywhere in the path. The only Rails-side statement is a doc comment: "Note that
  you can't use HAVING without also specifying a GROUP clause." `hey_record` already refuses
  unscoped `update`/`delete` (`sql.hey`), so a refusal here is house style, and the error arrives at
  the call site rather than as a backend error string.
- **`or_where` takes a node, not a relation.** Rails' `Relation#or` requires structurally compatible
  relations and raises otherwise; that machinery exists to merge two whole query shapes. The narrow
  form covers the actual need (`status = 'a' OR status = 'b'`) with none of the compatibility rules.
- **`one` instead of `first`, `count_rows` instead of `count`.** `todos.md` item 2 records that
  `HeyRecord.first` is mis-resolved as the collections builtin `first` in the compiled lane. Do not
  add more names in that class. Item 2 also notes `first` returns `Result.ok(nil)`; `one` should
  return a typed `not_found` miss instead, closing that at the same time.
- **`lock` takes a mode name, not a SQL string.** See §7.

### 4.3 What "lazy" has to mean here

Rails' laziness is `@arel ||= build_arel` plus `@records` / `loaded?`. `hey_record` datasets are
already values with no identity and no cache, so "lazy" reduces to a rule rather than a mechanism:

> Every function above except the execution group returns a dataset and performs no IO. `plan`
> renders. The execution group is the only place a connection callable is invoked.

That rule is testable without a database, which is the property `src/db/statements_spec.hey` already
relies on (it asserts exact SQL text and bound params with no IO). Keep it.

Two of Rails' laziness behaviors are worth adopting even without a load cache:

- **Freeze after render.** `assert_modifiable!` raises `UnmodifiableRelation` once the relation has
  produced Arel or loaded. The Hey analogue: `plan(dataset)` returns a plan record, and a dataset
  that has been planned is not the thing you keep chaining -- chain the dataset, plan last. Since
  Hey datasets are values this cannot go wrong the way it can in Ruby, but the *documented* rule
  should still be "plan is terminal".
- **Never send a query that cannot match.** `exec_main_query` returns `[].freeze` for a contradictory
  where clause and for `none`, and `execute_simple_calculation` returns a literal `0` for
  `limit_value == 0`. Both are one tree inspection each.

---

## 5. Predicates and the `where` shape

`where(dataset, criteria)` keeps today's record form and today's meaning -- so existing callers do
not change -- but produces nodes. The extended forms are operator-tagged records, which avoids
inventing a string mini-language:

```hey
HeyRecord.where(users, {status: 'active', role: ['admin', 'owner'], deleted_at: nil})
# -> AND(equal(col status, bind 'active'),
#        in(col role, [bind 'admin', bind 'owner']),
#        is_null(col deleted_at))

HeyRecord.where_node(outbox,
  HeyRecordAst.conjunction([
    HeyRecordAst.equal(HeyRecordAst.column('status'), HeyRecordAst.bind('pending')),
    HeyRecordAst.less_or_equal(HeyRecordAst.column('available_at'), HeyRecordAst.bind(cutoff))
  ]))
```

The empty-array contradiction (`1 = 0`) that `conditions_plan` already implements becomes
`HeyRecordAst.equal(literal_value(1), literal_value(0))` -- same behavior, now visible in the tree
and therefore inspectable by a test.

---

## 6. Aggregates, GROUP BY / HAVING, and `count`

Rails puts all of this in `relation/calculations.rb`, and the important lesson is that **`count` is
not one operation**. All of the following is verified in source:

- **With a `group`, `count` returns a Hash**, not an integer -- `execute_grouped_calculation` keys
  the result by the group values (and unwraps a single-element key). So the *return type* depends on
  a slot elsewhere in the chain. Worse: if the single group field is a `belongs_to`, Rails issues a
  **second query** to look up the associated records and keys the hash by those.
- **With `limit` or `offset`, `count` becomes a subquery.** The predicate is explicit:

  ```ruby
  def build_count_subquery?(operation, column_name, distinct)
    # SQLite and older MySQL does not support `COUNT DISTINCT` with `*` or
    # multiple columns, so we need to use subquery for this.
    operation == "count" &&
      (((column_name == :all || select_values.many?) && distinct) || has_limit_or_offset?)
  end
  ```

  Note this **never consults the adapter**. Rails rewrites multi-column distinct counts into
  `SELECT COUNT(*) FROM (SELECT DISTINCT a, b FROM ...) subquery_for_count` for *every* backend --
  the comment names SQLite and older MySQL, but PostgreSQL also rejects `COUNT(DISTINCT a, b)` and
  gets the same rewrite for free. There is no PostgreSQL branch anywhere in the file. **This is a
  model answer to "how do you handle a construct one backend can't express": rewrite the tree into
  something every backend can express, once, rather than teaching each visitor a special case.**
- **`count` with `distinct` and `column_name == :all`** rewrites the column to the primary key when
  the relation has no select and no order, because `COUNT(DISTINCT *)` is not legal anywhere.
- **`count` on an eager-loaded relation** forces `distinct` and sets the select to the primary key,
  or the joins inflate the answer -- and it then **drops `order_values`**, with the source comment
  "PostgreSQL: ORDER BY expressions must appear in SELECT list when using DISTINCT".
- `execute_simple_calculation` likewise does `unscope(:order)` with the comment "PostgreSQL doesn't
  like ORDER BY when there are no GROUP BY".
- `limit_value == 0` short-circuits to a literal `0` with **no query**, and a contradiction in the
  where clause returns `{}` / `ActiveRecord::Result.empty` the same way.
- **`pluck` triggers an immediate query and cannot be chained**; it also ignores any previous
  `select`, returns early from memory if the relation is already loaded and all requested columns
  are present, and passes its arguments through `disallow_raw_sql!` (see §9). `pick` is
  `limit(1).pluck(...).first`; `ids` is `pluck(*primary_key)`.
- `sum` and `count` both have Ruby-side block forms that **load every record** -- a performance
  cliff hidden behind the same method name.

Sources: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation/calculations.rb>,
<https://guides.rubyonrails.org/active_record_querying.html>

### Proposal

Split the shapes rather than overloading one function, because Hey has no way to make a return type
depend on a slot:

| Function | Shape | Notes |
|---|---|---|
| `count_rows(dataset)` | `Result` of integer | refuses if `group` is non-empty -- directs the caller to `grouped_counts` |
| `count_distinct(dataset, column)` | `Result` of integer | one column only; a multi-column form is refused with a message naming the portability problem |
| `grouped_counts(dataset)` | `Result` of record keyed by the group value | refuses if `group` is empty |
| `aggregate(dataset, name, column)` | `Result` of value | `name` in `['sum','avg','min','max']`; anything else is a typed refusal, so `aggregate(d, 'array_agg', c)` does not silently emit PostgreSQL-only SQL |

Two behaviors from `calculations.rb` should be copied verbatim because they are correctness, not
polish:

1. **Limit/offset forces a subquery.** `count_rows` on a dataset with a limit or offset must wrap
   (`SELECT COUNT(*) FROM (<the limited query>) AS subquery_for_count`), never drop the limit.
   Dropping it returns a different number.
2. **Multi-column distinct counts are rewritten, not refused.** `count_distinct` over more than one
   column becomes the same subquery form, for all three backends, exactly as Rails does. The §11
   capability record therefore does **not** need `count_distinct_multi_column` as a per-dialect
   flag -- the rewrite makes the question moot. (That entry is left in the §11 sketch only as an
   example of a flag one might reach for and should not.)

MMeow's actual aggregate usage is modest and all of it fits: `count(c.ancestor_id)` with
`GROUP BY o.objective_id`, `count(*)::int` in a scalar subquery, `GREATEST(0, FLOOR(...))`,
and `COALESCE`. The scalar subquery (`(SELECT count(*) FROM ...) AS objective_count`) needs a
`subquery` node; that is a §10 stage-3 item, not stage 1.

---

## 7. Locking

### What Rails does

`Relation#lock` stores a value; `build_arel` calls `arel.lock(lock_value)`; `SelectManager#lock`
wraps it:

```ruby
def lock(locking = Arel.sql("FOR UPDATE"))
  case locking
  when true
    locking = Arel.sql("FOR UPDATE")
  when Arel::Nodes::SqlLiteral
  when String
    locking = Arel.sql locking
  end
  @ast.lock = Nodes::Lock.new(locking)
  self
end
```

Base `ToSql` then emits it: `def visit_Arel_Nodes_Lock(o, collector); visit o.expr, collector; end`.

**So `SKIP LOCKED` is not modelled at all.** `lock("FOR UPDATE SKIP LOCKED")` is an opaque
`SqlLiteral` carried inside a `Lock` node. Rails does not know what it means; it only knows where it
goes.

And SQLite's visitor drops the node entirely:

```ruby
# Locks are not supported in SQLite
def visit_Arel_Nodes_Lock(o, collector)
  collector
end
```

No error, no warning, no deprecation: `Account.lock.find(1)` on SQLite produces a plain
`SELECT ... WHERE id = ?` and appears to succeed. The `SQLite3Adapter` itself contributes nothing
here -- its only involvement is `def arel_visitor; Arel::Visitors::SQLite.new(self); end`. A
test-on-SQLite, run-on-PostgreSQL project gets no signal from the stack that its locking is absent
in one of the two.

Rails does guard the *other* hazards around locking, and both are worth copying: `exec_queries`
raises `ActiveRecord::ReadOnlyError, "Lock query attempted while in readonly mode"` when a locking
query is issued under `current_preventing_writes`, and `lock!` refuses on a record with unsaved
changes -- *"Locking a record with unpersisted changes is not supported. Use `save` to persist the
changes, or `reload` to discard them explicitly."* Both are refusals about *when* a lock is asked
for; neither is about whether the backend can express it.

### The proposal, which deliberately diverges

MMeow's `strip_locking` does exactly what Rails' SQLite visitor does -- silently removes the clause
-- and its own comment names the cost:

> SQLite serialises writers, so a claim cannot race another claim the way it can in Postgres.
> Removing the clause is a no-op in MEANING -- but it is a real difference in CONCURRENCY, recorded
> in `docs/dev/storage_backends.md`.

That reasoning is sound *for this application* and wrong as a library default. A silent drop means a
worker pool that is correct on PostgreSQL and quietly serialized on SQLite, with nothing in the code
saying so. Proposal:

```hey
fn lock(dataset, mode)   # 'none' | 'update' | 'update_skip_locked' | 'update_nowait' | 'share'
```

- Modes are **named, not spelled in SQL**, so `SKIP LOCKED` is a tree fact and a dialect can answer
  "can I do this?" rather than pattern-matching text.
- PostgreSQL emits `FOR UPDATE` / `FOR UPDATE SKIP LOCKED` / `FOR UPDATE NOWAIT` / `FOR SHARE`.
- MySQL 8.0+ emits the same four (`FOR UPDATE SKIP LOCKED` is supported since 8.0.1); older MySQL
  emits `FOR UPDATE` / `LOCK IN SHARE MODE` and **refuses** the skip/nowait modes.
- SQLite has no key for `emit_lock` at all. Calling `lock` on a SQLite dataset therefore fails with
  `hey_record: dialect sqlite3 cannot emit node: lock`, and the application chooses -- explicitly --
  between `lock(d, 'none')` for SQLite and a different claim strategy. The choice is recorded in the
  application's code, where a reviewer sees it, rather than in a translator's comment.

An application that genuinely wants Rails' behavior gets it by asking:
`if HeyRecordDialect.supports?(dialect, 'lock_skip_locked') ... end`. Opt-in degradation, not
default degradation.

**Flagging as unverified:** the MySQL `SKIP LOCKED` version floor (8.0.1) and the MariaDB position
were not checked against a primary source for this document; treat the MySQL row of that list as
needing confirmation before implementation.

---

## 8. UPSERTS

This is the largest single win: 37 of MMeow's 140 statements are upserts, and all 37 are currently
hand-written PostgreSQL passed through a text rewriter.

### 8.1 How Rails does it

Three public entry points, all one code path parameterized by `on_duplicate`. Since **Rails 7.2**
they live on `ActiveRecord::Relation` (they were on `Persistence::ClassMethods` through 7.1):

```ruby
def insert_all(attributes, returning: nil, unique_by: nil, record_timestamps: nil)
  InsertAll.execute(self, attributes, on_duplicate: :skip, ...)
end
def insert_all!(attributes, returning: nil, record_timestamps: nil)
  InsertAll.execute(self, attributes, on_duplicate: :raise, ...)
end
def upsert_all(attributes, on_duplicate: :update, update_only: nil, returning: nil, unique_by: nil, record_timestamps: nil)
  InsertAll.execute(self, attributes, on_duplicate: on_duplicate, ...)
end
```

The architecture is three layers, and this separation is the thing to copy:

1. **Capability predicates on the adapter** -- the feature-detection layer. `AbstractAdapter`
   defaults every one to `false`:
   ```ruby
   def supports_insert_returning?;         false; end
   def supports_insert_on_duplicate_skip?; false; end
   def supports_insert_on_duplicate_update?; false; end
   def supports_insert_conflict_target?;   false; end
   ```
2. **`InsertAll`** -- the policy layer. It validates options against those predicates in
   `initialize`, **before any SQL exists**, and raises `ArgumentError`.
3. **`build_insert_sql(insert)`** on each adapter -- the grammar layer. `InsertAll::Builder` hands
   it *fragments* (`into`, `values_list`, `conflict_target`, `updatable_columns`, `returning`,
   `touch_model_timestamps_unless`, `raw_update_sql`) and the adapter assembles the statement. There
   is no `to_sql` template in the Builder at all.

The three grammars, quoted verbatim:

```ruby
# PostgreSQL
sql = +"INSERT #{insert.into} #{insert.values_list}"
if insert.skip_duplicates?
  sql << " ON CONFLICT #{insert.conflict_target} DO NOTHING"
elsif insert.update_duplicates?
  sql << " ON CONFLICT #{insert.conflict_target} DO UPDATE SET "
  ... sql << insert.updatable_columns.map { |column| "#{column}=excluded.#{column}" }.join(",")
end
sql << " RETURNING #{insert.returning}" if insert.returning
```

```ruby
# SQLite3 -- structurally identical to PostgreSQL
sql << " ON CONFLICT #{insert.conflict_target} DO NOTHING"
sql << " ON CONFLICT #{insert.conflict_target} DO UPDATE SET "
    << insert.updatable_columns.map { |column| "#{column}=excluded.#{column}" }.join(",")
sql << " RETURNING #{insert.returning}" if insert.returning
```

```ruby
# MySQL -- a different grammar, and note there is NO conflict target anywhere
no_op_column = quote_column_name(insert.keys.first) if insert.keys.first
if supports_insert_raw_alias_syntax?          # !mariadb? && database_version >= "8.0.19"
  values_alias = quote_table_name("#{insert.model.table_name.parameterize}_values")
  sql = +"INSERT #{insert.into} #{insert.values_list} AS #{values_alias}"
  if insert.skip_duplicates?
    sql << " ON DUPLICATE KEY UPDATE #{no_op_column}=#{quoted_table_name}.#{no_op_column}"
  elsif insert.update_duplicates?
    sql << " ON DUPLICATE KEY UPDATE "
        << insert.updatable_columns.map { |column| "#{column}=#{values_alias}.#{column}" }.join(",")
  end
else                                           # older MySQL and all MariaDB
  if insert.skip_duplicates?
    sql << " ON DUPLICATE KEY UPDATE #{no_op_column}=#{no_op_column}"
  elsif insert.update_duplicates?
    sql << " ON DUPLICATE KEY UPDATE "
        << insert.updatable_columns.map { |column| "#{column}=VALUES(#{column})" }.join(",")
  end
end
```

Five things in there are worth stating plainly because they are non-obvious:

- **MySQL "skip duplicates" is not `INSERT IGNORE`.** It is a no-op self-assignment
  `ON DUPLICATE KEY UPDATE col=table.col`. `INSERT IGNORE` swallows unrelated errors (bad data, FK
  failures); the self-assignment swallows only duplicate-key.
- **MySQL has no conflict target.** `ON DUPLICATE KEY` matches *any* unique key.
  `insert.conflict_target` is never called in the MySQL adapter, which is exactly why
  `supports_insert_conflict_target?` is undefined there and inherits `false`.
- **`conflict_target` only ever renders a column list.** The string `ON CONSTRAINT` does not appear
  anywhere in `insert_all.rb`. `unique_by:` accepts an index *name*, but Rails resolves the name to
  an `IndexDefinition` via the schema cache and emits its **columns**. A partial index contributes
  its predicate: `sql << " WHERE #{index.where}" if index.where` -- that is the *index* predicate
  replayed so PostgreSQL can match the partial index, **not** a user filter.
- **`unique_by` resolution can fail** with `"No unique index found for #{name_or_columns}"`, matched
  by index name **or** by column set order-insensitively.
- **There is no conditional `DO UPDATE ... WHERE`.** Verified absent from `main`, 8.1, 8.0, 7.2,
  7.1, 7.0, 6.1 and 6.0. The open PR rails/rails#56981 (`on_duplicate: :update_if_dirty`, opened
  2026-03-13, still open) proposes a PostgreSQL-only version. Today the only route is
  `on_duplicate: Arel.sql("...")`, which is appended *inside* the SET list -- so you can write
  `price = GREATEST(commodities.price, EXCLUDED.price)` but not a trailing `WHERE`.

**Raise vs. degrade vs. emulate.** Rails uses all three, systematically:

| Policy | When | Example |
|---|---|---|
| **Raise** (`ArgumentError` from `initialize`, before SQL) | the user *explicitly asked* for something unsupported | `"#{connection.class} does not support :returning"`, `"... does not support upsert"`, `"... does not support skipping duplicates"`, `"... does not support :unique_by"` |
| **Silently degrade** | the request was an implicit default | `returning` defaults to `false` where RETURNING is unsupported; `unique_by: nil` on MySQL returns early; **`on_duplicate: :update` with an empty updatable-column set silently becomes `:skip`** |
| **Emulate** | the backend has *a* mechanism with different spelling | MySQL's no-op self-assignment for DO NOTHING; the `VALUES(col)` vs `AS alias` split; the `updated_at` `CASE WHEN` dirty-check |

That middle row is the trap. The `:update` -> `:skip` degradation surprises people, and the
`returning` asymmetry (implicit degrade, explicit raise) is the kind of rule that is fine in a
framework with a decade of documentation and wrong in a new library.

The `record_timestamps` machinery deserves one note because it shows how far the fragment design
stretches. `touch_model_timestamps_unless` emits a hand-rolled dirty check -- keep the existing
`updated_at` if every updatable column is null-safe-equal to the incoming row, otherwise set it to
now -- and the *only* per-adapter difference is the comparison operator, supplied as a block:

| Adapter | comparison |
|---|---|
| PostgreSQL | `table.col IS NOT DISTINCT FROM excluded.col` |
| SQLite | `col IS excluded.col` |
| MySQL >= 8.0.19 | `` table.col<=>`t_values`.col `` |
| MySQL legacy / MariaDB | `col<=>VALUES(col)` |

Sources:
<https://github.com/rails/rails/blob/main/activerecord/lib/active_record/insert_all.rb>,
<https://github.com/rails/rails/blob/main/activerecord/lib/active_record/connection_adapters/postgresql_adapter.rb>,
<https://github.com/rails/rails/blob/main/activerecord/lib/active_record/connection_adapters/abstract_mysql_adapter.rb>,
<https://github.com/rails/rails/blob/main/activerecord/lib/active_record/connection_adapters/sqlite3_adapter.rb>,
<https://api.rubyonrails.org/classes/ActiveRecord/Relation.html>,
<https://github.com/rails/rails/pull/56981>

### 8.2 Proposed `hey_record` upsert API

```hey
module HeyRecordUpsert
  # Build a plan. NO IO. Refusals are typed Results, not `fail`, because the
  # caller may legitimately probe capability.
  fn plan(dialect, capabilities, request)

  # request:
  # {
  #   table:      'ops.outbox',
  #   rows:       [{aggregate_type: 'x', idempotency_key: 'k', payload: p}, ...],
  #   on_conflict: 'update',        # 'skip' | 'update' | 'raise'
  #   conflict:   ['idempotency_key'],   # the conflict TARGET columns
  #   update:     ['status', 'payload'], # [] means "every column except the target"
  #   returning:  ['outbox_id']          # [] means none
  # }

  fn insert_all(dataset, rows, options)   # on_conflict: 'raise'
  fn skip_all(dataset, rows, options)     # on_conflict: 'skip'
  fn upsert_all(dataset, rows, options)   # on_conflict: 'update'
end
```

Departures from Rails, each deliberate:

- **`conflict` is a column list, never an index name.** Rails resolves an index name through the
  schema cache; `hey_record` has no schema cache and adding one to support a naming convenience is
  not worth it. Column lists are what the three backends actually accept.
- **`update: []` means "all non-conflict columns"; it never silently becomes `skip`.** If the
  computed set is empty, `plan` returns
  `Result.error_value('upsert_no_updatable_columns', ...)`. Rails' silent `:update -> :skip` is the
  one behavior in this area I would not copy: it turns "update this row" into "do nothing" without a
  word.
- **Refusals are `Result` errors, not exceptions**, because the whole package is Result-typed
  already (`docs/DESIGN.md`: "No nil across the API").

### 8.3 One call, three backends

Take the real MMeow statement at `src/db/statements.hey:380` (mastery objective state), reduced:

```hey
HeyRecordUpsert.upsert_all(objective_state, rows, {
  conflict:  ['learner_id', 'objective_id'],
  update:    ['state', 'p_success'],
  returning: ['learner_id']
})
```

| | PostgreSQL | SQLite3 | MySQL |
|---|---|---|---|
| **INSERT head** | `INSERT INTO "mastery"."objective_state_current" ("learner_id","objective_id","state","p_success") VALUES ($1,$2,$3,$4)` | `INSERT INTO "mastery.objective_state_current" (...) VALUES (?,?,?,?)` | ``INSERT INTO `mastery`.`objective_state_current` (...) VALUES (?,?,?,?) AS `objective_state_current_values` `` |
| **conflict target** | `ON CONFLICT ("learner_id","objective_id")` | `ON CONFLICT ("learner_id","objective_id")` | **not expressible** -- `ON DUPLICATE KEY` matches any unique key |
| **DO UPDATE** | `DO UPDATE SET "state"=excluded."state","p_success"=excluded."p_success"` | `DO UPDATE SET "state"=excluded."state","p_success"=excluded."p_success"` | ``ON DUPLICATE KEY UPDATE `state`=`objective_state_current_values`.`state`,`p_success`=...`` (>=8.0.19); ``  `state`=VALUES(`state`) `` on older MySQL/MariaDB |
| **DO NOTHING** (`on_conflict: 'skip'`) | `ON CONFLICT (...) DO NOTHING`, or bare `ON CONFLICT DO NOTHING` with no target | same | emulated: ``ON DUPLICATE KEY UPDATE `learner_id`=`t`.`learner_id` `` |
| **RETURNING** | `RETURNING "learner_id"` | `RETURNING "learner_id"` | **not expressible** (MariaDB >= 10.5 only) |
| **conditional `DO UPDATE ... WHERE`** | expressible in the backend; **not offered by this API** (see below) | expressible in the backend; not offered | **not expressible at all** |
| **placeholders** | `$1..$n` | `?` | `?`, then inlined by `hey_mysql`'s escape-based interpolation |
| **schema qualification** | `"mastery"."objective_state_current"` | `"mastery.objective_state_current"` -- one identifier | `` `mastery`.`objective_state_current` `` |

**What is not expressible where, and what `hey_record` should do about it:**

| Feature | pg | sqlite3 | mysql | Proposed behavior on the backend that lacks it |
|---|---|---|---|---|
| conflict target columns | yes | yes | **no** | **Typed refusal** `upsert_conflict_target_unsupported`. Rails' answer is "MySQL just declares no support and `unique_by` raises"; the danger of quietly proceeding is that `ON DUPLICATE KEY` updates on a *different* unique key than the caller named, which changes which rows are modified. Refuse. |
| `RETURNING` | yes | yes | **no** (MariaDB >= 10.5 excepted) | **Typed refusal** `upsert_returning_unsupported` when explicitly requested. Do **not** copy Rails' implicit default-to-primary-key, because `hey_record` has no schema cache to know the primary key -- so there is no implicit case to degrade. |
| `DO NOTHING` | yes | yes | emulated | Emulate exactly as Rails does (no-op self-assignment on the first column), and say so in the generated SQL comment. |
| conditional `DO UPDATE ... WHERE` | yes | yes | **no** | **Not in the API at all**, matching Rails. MMeow's corpus has zero of these (verified: 0 of 37). If it is ever needed, add it as a PostgreSQL/SQLite-only option with a typed refusal on MySQL -- the shape rails/rails#56981 proposes. |
| partial-index conflict target (`ON CONFLICT (cols) WHERE pred`) | yes | yes | no | Stage 4. Requires either schema introspection or an explicit `conflict_where` node; prefer the explicit node, since `hey_record` has no schema cache. |
| `excluded.` pseudo-table | `excluded` | `excluded` | row alias or `VALUES()` | Handled by `emit_upsert_clause`; the caller never spells it. |
| self-referencing no-op update (MMeow line 627: `DO UPDATE SET detail = ops.notification_delivery.detail`, used to force RETURNING on conflict) | yes | yes | yes | Support as `update: {detail: HeyRecordAst.column('ops.notification_delivery.detail')}` -- an update map whose values are nodes, not just a column-name list. This idiom is in the corpus and must not need raw SQL. |

**Timestamps.** `record_timestamps` and the `CASE WHEN` dirty-check are explicitly **out of scope**
for the first implementation. `HeyRecordModel.define` already takes a `timestamps` option that
nothing currently consumes; wiring it into upserts should wait until the model layer actually
manages timestamps, and the dirty-check should be opt-in when it lands (it is a real per-adapter
divergence in four spellings, for a feature MMeow does not use -- its statements set
`updated_at = now()` explicitly).

---

## 9. Where Rails draws the escape hatch, and where `hey_record` should

Rails' position, visible in the code rather than the docs:

- **`Arel.sql(str)` is the opt-in, and it is a signature rather than a sanitizer.** Its own docstring
  says so: *"Great caution should be taken to avoid SQL injection vulnerabilities. This method should
  not be used with unsafe values such as request parameters or model attributes."* It produces a
  `SqlLiteral` (or, when given binds, a `BoundSqlLiteral` -- see below).
- **There is an allowlist, and it is narrower than people assume.** `disallow_raw_sql!` lives in
  `Sanitization::ClassMethods`:
  ```ruby
  def disallow_raw_sql!(args, permit: adapter_class.column_name_matcher)
    unexpected = nil
    args.each do |arg|
      next if arg.is_a?(Symbol) || Arel.arel_node?(arg) || permit.match?(arg.to_s.strip)
      (unexpected ||= []) << arg
    end
    if unexpected
      raise(ActiveRecord::UnknownAttributeReference,
        "Dangerous query method (method whose arguments are used as raw " \
        "SQL) called with non-attribute argument(s): " \
        "#{unexpected.map(&:inspect).join(", ")}." \
        "This method should not be called with user-provided values, such as request " \
        "parameters or model attributes. Known-safe values can be passed " \
        "by wrapping them in Arel.sql()."
      )
    end
  end
  ```
  Three exemptions: Symbols, anything that is already an Arel node (which is how `Arel.sql` gets
  through), and strings matching a regexp -- `column_name_matcher` / `column_name_with_order_matcher`,
  which live in `ConnectionAdapters::Quoting::ClassMethods` and match `table.column`, bare `column`,
  simple function calls, optional `AS alias`, and (for the order variant) `ASC`/`DESC`/`NULLS
  FIRST`/`NULLS LAST`.

  **It is applied at exactly five call sites**: `order`/`reorder`/`default_order` (via
  `preprocess_order_args`), `in_order_of`, `pluck`, `sanitize_sql_for_order`, and
  `insert_all`/`upsert_all`'s `on_duplicate` and `returning`. It is **not** applied to `group`,
  `having`, `select`, `joins`, or `where`-with-a-String -- those accept raw SQL with no check at
  all. Rails guards the places where a raw string is most often built from a request parameter (a
  sort column), not the places where raw SQL is most powerful.

  The opt-out is gone: `allow_unsafe_raw_sql` existed through Rails 6.1 and is absent from `main`,
  so the check is now unconditional. (The older names `enforce_raw_sql_allowlist` /
  `enforce_raw_sql_whitelist` were the 5.2/6.0 spellings.)
- **`find_by_sql` / `select_all` / `exec_query` / `execute`** remain first-class. The guide's
  framing: `find_by_sql` "provides you with a simple way of making custom calls to the database and
  retrieving instantiated objects"; `select_all` does the same "but will not instantiate them".
  `find_by_sql` accepts an **array** form (`["... WHERE author = ? AND created > ?", id, date]`)
  which goes through `BoundSqlLiteral` -- real binds, not interpolation. A bare String does not.
  The connection-level docs are equally blunt about `execute`: "If the query is read-only, consider
  using #select_all instead", and "depending on your database connector, the result returned by this
  method may be manually memory managed. Consider using #exec_query wrapper instead."
- **Values are never interpolated.** The guide's rule is
  `Book.where("title = ?", params[:title])`, never `where("title = #{...}")`, with
  `sanitize_sql_like` for `LIKE` patterns. `sanitization.rb`'s interpolating helpers are themselves
  documented as second-best: *"Before using this method, please consider if Arel.sql would be better
  for your use-case."* Its `?`-substitution counts placeholders and raises
  `PreparedStatementInvalid, "wrong number of bind variables (#{provided} for #{expected}) in:
  #{statement}"` on a mismatch -- the same failure mode as `hey_mysql`'s
  `mysql_bind_count_mismatch`, for the same reason: both are counting characters in text.
- **`Arel.sql` also carries `retryable:`**, so a literal can declare whether it is safe to re-run
  ("Use this option only if the SQL is idempotent, as it could be executed more than once"). Even
  the escape hatch carries metadata, and the collector ANDs it across the whole tree.

### Proposal

`hey_record` already has one escape hatch (`order_raw`, called out in `docs/DESIGN.md` as
"available only through the explicitly named `order_raw` escape hatch"). Generalize that instinct:

1. **`HeyRecordAst.raw(sql)`** is the only way raw text enters a tree, and `HeyRecordVisit.node`
   refuses any non-node value with a message naming `bind()` and `raw()`. That is Rails'
   `unsupported` alias table, in one branch.
2. **Every `*_raw` name stays explicit.** `order_raw` keeps its name; add `where_raw`,
   `select_raw`, `join_raw` only as they are needed, never a general `raw` builder that hides the
   word. Note that this is *stricter* than Rails, which has no allowlist on `select`, `joins`,
   `group`, `having` or string `where` at all -- the raw-ness there is invisible at the call site.
   Making it visible in the name is cheaper than a regexp and does not have the regexp's false
   negatives. `hey_record` should **not** copy `column_name_matcher`: an identifier allowlist is a
   defence for a design where raw strings are accepted by default, and the design proposed here does
   not accept them by default.
3. **`HeyRecord.query_params` / `execute_params` stay public and stay documented as legitimate.**
   They are `find_by_sql`. The rule to write down is not "never use them" but:

   > Raw SQL is legitimate when the query is (a) backend-specific by intent, (b) tuned against a
   > specific planner, or (c) a construct the AST does not yet model. It is **not** legitimate as a
   > way to avoid learning the relation API, and it is never legitimate for building a predicate
   > out of values -- bind them.

4. **A raw node poisons portability, and should say so.** Rails tracks this on the collector
   (`preparable = false` on `SqlLiteral`). The Hey equivalent: a plan whose tree contained a `raw`
   node carries `portable: false`, and a conformance test can assert that a given statement set is
   fully portable. That is a direct replacement for MMeow's
   `tests/db/sqlite_dialect_corpus_spec.hey`, which currently greps translator output for residual
   PostgreSQL constructs -- a check that is only necessary because the output is text.

---

## 10. Staged plan

The constraint is that MMeow has 140 statements and 776 lines of translator in production. A
big-bang rewrite would need all 140 ported and all eleven rewrite rules replaced before anything
ships. Stage the work so **each stage is independently shippable and the application migrates one
statement at a time.**

The enabling property: **`plan(dataset)` returns the existing `{kind: 'hey_record_sql_plan', sql,
parameters}` record.** Both the new AST path and the old string path produce it, both feed
`HeyRecord.query_plan` / `execute_plan`, and both feed `src/db/statements_spec.hey`'s no-IO
assertions. So a migrated statement and a hand-written one are interchangeable at the call site,
and the repositories do not change.

### Stage 0 -- prerequisites (no new API)

- **Audit names against builtins.** `todos.md` item 2 records that `HeyRecord.first` is mis-resolved
  as the collections builtin `first` in the compiled lane. Before naming ~40 new functions, get a
  definitive builtin list and check every proposed name. `count`, `sum`, `min`, `max`, `find`,
  `select`, `group`, `join`, `all`, `any` are the obvious risks. This proposal already avoids
  `first`/`count`; the rest needs verifying, not guessing.
- **Land the type layer** (`RAILS_ADAPTER_ARCHITECTURE.md`). The AST needs `quote_identifier` and a
  value encoder per dialect; both belong there.
- **Extend `dialect.hey`** from three descriptors to a capability record (§11).

### Stage 1 -- AST + visitor + collector, SELECT only

`ast.hey`, `collector.hey`, `visitor.hey`, `visitor_base.hey`, and one visitor per dialect.
Reimplement `select_plan` / `insert_plan` / `update_plan` / `delete_plan` on top of it. Node set:
column, table, bind, literal, raw, star, the six comparisons, null tests, in-list, and/or/not/
grouping, ordering, limit, offset, select_core, select_statement.

**Exit test:** every existing `specs/sql_spec.hey` and `specs/dataset_spec.hey` assertion passes
byte-for-byte with no changes. The AST is invisible from outside. The `?`-to-`$n` renumbering in
`pg.hey` is deleted and replaced by `postgres_placeholder`.

*Application impact: none. Nothing to migrate.*

### Stage 2 -- upserts

`upsert.hey` plus `emit_upsert_clause` in each dialect visitor. This is deliberately second, not
later, because it is the largest concentration of duplicated hand-written SQL (37 statements) and
the one where the three grammars differ most -- the highest value per line of visitor.

**Exit test:** the three-backend table in §8.3 is a spec, asserted with no IO.

*Application impact: the 37 upserts migrate one at a time. Each becomes a `HeyRecordUpsert` call
whose plan is asserted against the exact SQL the current hand-written statement produces, so the
migration is provably behavior-preserving before it runs anywhere.*

### Stage 3 -- joins, group, having, aggregates, locking

`joins` / `left_joins` / `group` / `having` / `count_rows` / `count_distinct` / `grouped_counts` /
`aggregate` / `lock` and the corresponding nodes and emits. Also the `subquery` node, needed for
MMeow's `(SELECT count(*) ...) AS objective_count` and for `count_rows` under limit/offset.

**Exit test:** the 12 joined statements and the outbox claim/reaper pair render identically on
PostgreSQL, and SQLite either renders correctly or refuses by name (`lock`).

*Application impact: the 12 JOIN statements and the 2 locking statements migrate. The locking pair
is the interesting one: it forces MMeow to state its SQLite concurrency choice in code rather than
in a translator comment.*

### Stage 4 -- the long tail, and the translator's retirement

Functions and casts: `now`, `epoch_seconds`, `epoch_between`, `interval_seconds`, `to_date`,
`greatest`/`least`, `coalesce`, `case_when`, plus the array/JSON predicates (`= ANY(...)`, array
overlap, JSON existence). These map to `rewrite_extract`, `rewrite_interval`, `rewrite_now`,
`rewrite_greatest`, `rewrite_any`, `rewrite_overlap`, `rewrite_json_exists`.

**The array/JSON group should be attempted last and may never fully land.** MMeow's array columns
are TEXT holding JSON on SQLite and `text[]` on PostgreSQL, read with `json_each()` on one side and
`= ANY()` on the other. That is not a syntax difference; it is a *storage model* difference, and
modelling it in the AST means the AST takes a position on array representation. Better: keep these
as `raw` nodes with a per-dialect pair, and let the `portable: false` flag make their presence
visible.

**What stays raw SQL, permanently:**

- DDL beyond `migration.hey`'s helpers (indexes with operator classes, partial-index predicates,
  extensions, triggers).
- Anything planner-tuned: index hints, `SET LOCAL`, explicit `MATERIALIZED` CTEs.
- PostgreSQL-only constructs used deliberately on a PostgreSQL-only path: `LISTEN/NOTIFY`, `COPY`,
  advisory locks, `jsonb` operators, full-text search.
- Recursive CTEs and window functions until there is a second consumer asking for them. One
  application's need does not justify nodes.
- The array/JSON predicates above, unless and until the storage models converge.

### The retirement test

`sqlite_dialect.hey` can be deleted when every statement in `statements.hey` either (a) is built
from the AST or (b) is a `raw` plan explicitly marked non-portable and executed only on a
PostgreSQL-configured deployment. The `portable: false` flag from §9 makes that a mechanical check
rather than a judgment call -- and it replaces `sqlite_dialect_corpus_spec.hey`'s residual-construct
grep with a structural assertion.

---

## 11. Which changes belong where

### `hey_record` (the porcelain) -- everything structural

| New/changed | Contents |
|---|---|
| `ast.hey` (new) | node constructors and validation. Knows no dialect. |
| `collector.hey` (new) | binding and substituting collectors; bind indexing. Knows no dialect. |
| `visitor.hey` (new) | dispatch, the unknown-node refusal, the non-node refusal, `nodes`/`clause` helpers. |
| `visitor_base.hey` (new) | portable SQL emits -- the `ToSql` equivalent. |
| `visitor_sqlite3.hey`, `visitor_mysql.hey`, `visitor_postgres.hey` (new) | dialect overrides. **These live in `hey_record`, not in the adapter packages** -- see the boundary rule below. |
| `upsert.hey` (new) | the request record, validation against capabilities, and the fragment set. |
| `dataset.hey` (changed) | typed slots; the relation API of §4.2; `plan` builds a tree and renders it. |
| `sql.hey` (changed) | keeps its public functions as thin wrappers over the AST, so callers do not break. `literal_insert` stays as the DDL/debug path. |
| `dialect.hey` (changed) | grows from three descriptors to the capability record below. |
| `model.hey` (changed) | `one` replaces `first`; gains `upsert`. |

**The boundary rule.** A dialect visitor is a property of *SQL grammar*, not of *transport*. It
needs no native library, no socket, and no connection. Putting `visitor_postgres.hey` in
`hey_record` means: the postgres visitor can be tested with zero IO and zero native build; a machine
with no libpq can still run the full SQL-rendering suite; and `hey_record` keeps its stated property
of zero driver dependencies (`docs/DESIGN.md`: "the store never dials"). The alternative -- shipping
each visitor with its driver -- would make the SQL suite depend on three native builds and would put
`hey_record`'s own conformance tests behind a database.

This mirrors Rails only partly: Rails puts `arel/visitors/postgresql.rb` inside `activerecord`
alongside the adapters, which is one gem. `hey_record` is not one gem, and the split above is the
faithful translation of Rails' *intent* (one library owns SQL) rather than its file layout.

### The adapter packages -- capability reporting and result shape only

| Package | Change |
|---|---|
| `hey_sqlite3` | Extend `capabilities()` with the query-layer keys (below). No SQL generation. It already handles `RETURNING` correctly through `execute_params` -- that work is done. |
| `hey_mysql` | Extend `capabilities()`. Report `insert_returning: false`, `insert_conflict_target: false`, `lock_skip_locked: <version-gated>`, `insert_raw_alias_syntax: <version-gated>`. It should also report `server_version` so `hey_record` can pick the `AS alias` vs `VALUES()` upsert grammar -- **this is the one genuinely new capability the driver must expose**, since only the driver can ask the server. |
| `hey_postgres` | Whoever builds it: return a `hey_record_connection` record directly (dialect + the six callables), so `pg.hey`'s bridge becomes unnecessary, and bind `$n` natively via `PQexecParams` as `PACKAGE_SPEC.md` already requires. Report `insert_returning: true`, `insert_conflict_target: true`, `lock_skip_locked: true`. |

### The capability record

`dialect.hey` today:

```hey
{name: 'sqlite3', identifier_quote: '"', auto_increment: 'AUTOINCREMENT', boolean_true: '1', boolean_false: '0'}
```

Proposed additions -- static grammar facts stay on the dialect; server-version-dependent facts come
from the connection's `capabilities()` and are merged in at `HeyRecord.from`:

```hey
{
  name: 'postgres',
  identifier_quote: '"',
  schema_qualified: true,          # false for sqlite3: "ops.outbox" is ONE identifier
  auto_increment: 'GENERATED BY DEFAULT AS IDENTITY',
  boolean_true: 'TRUE', boolean_false: 'FALSE',
  placeholder: postgres_placeholder,
  excluded_alias: 'excluded',      # 'excluded' | 'row_alias' | 'values_function'
  insert_conflict_target: true,
  insert_on_duplicate_skip: true,
  insert_on_duplicate_update: true,
  insert_returning: true,
  update_returning: true,
  delete_returning: true,
  lock_modes: ['update', 'update_skip_locked', 'update_nowait', 'share'],
  offset_without_limit: true,      # sqlite3/mysql: false, needs a synthetic limit
  distinct_on: true,
  ilike: true,
  count_distinct_multi_column: false
}
```

`HeyRecordDialect.supports?(dialect, feature)` becomes the one question every refusal asks, and it
is the same question `AbstractAdapter`'s `supports_*` predicates answer in Rails.

`HeyRecordDialect.named` already refuses unknown dialect names (0.3.0, replacing a silent fallback
to sqlite3). Keep that instinct: an unknown *capability* name should also refuse, not return false.
A typo'd feature check that returns false silently is the same defect class as a typo'd dialect name
that silently emitted SQLite SQL against MySQL.

### The consuming application

Nothing in `hey_record` or the adapters requires MMeow to change on any given day. What MMeow gets,
per stage: stage 1 deletes `rewrite_placeholders`; stage 2 lets the 37 upserts migrate individually;
stage 3 lets the 12 JOIN statements and the 2 locking statements migrate; stage 4 retires the rest
of the translator. Each migrated statement is provably equivalent because its plan is asserted, with
no IO, against the SQL the hand-written version produces today.

---

## 12. Sources

All Rails source read from `rails/rails` `main` during September 2026; the insert/upsert section is
pinned to commit `e970c80fd668f3f4ee08201bbbbcadfb2f29b1df`.

**Arel**
- Node docstring / design thesis: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/nodes/node.rb>
- Node manifest: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/nodes.rb>
- Visitor dispatch: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/visitors/visitor.rb>
- Base `ToSql`, `BIND_BLOCK`, `UnsupportedVisitError`: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/visitors/to_sql.rb>
- PostgreSQL visitor: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/visitors/postgresql.rb>
- MySQL visitor: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/visitors/mysql.rb>
- SQLite visitor: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/visitors/sqlite.rb>
- Collectors: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/collectors/sql_string.rb>, `.../bind.rb`, `.../substitute_binds.rb`, `.../composite.rb`, `.../plain_string.rb`
- `SelectManager`: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/select_manager.rb>

**ActiveRecord**
- Value slots, `spawn`, `load`/`exec_queries`: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation.rb>
- `build_arel`, `where`/`or`/`and`, `unscope`, `lock`: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation/query_methods.rb>
- `spawn`/`merge`/`except`/`only`: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation/spawn_methods.rb>
- Hash-to-node conversion: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation/predicate_builder.rb>
- `WhereClause#ast` / `#invert` / `#contradiction?`: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation/where_clause.rb>
- Range-to-node selection: <https://github.com/rails/rails/blob/main/activerecord/lib/arel/predications.rb>
- Bind objects: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation/query_attribute.rb>
- Calculations: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation/calculations.rb>
- `find_by_sql` / `count_by_sql` / `QUERYING_METHODS`: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/querying.rb>
- `disallow_raw_sql!`, `sanitize_sql_array`, `sanitize_sql_like`: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/sanitization.rb>
- `column_name_matcher` regexps: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/connection_adapters/abstract/quoting.rb>
- `Arel.sql` / `Arel.arel_node?`: <https://github.com/rails/rails/blob/main/activerecord/lib/arel.rb>
- `insert_all` / `upsert_all` entry points: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/relation.rb>
- `InsertAll` and `InsertAll::Builder`: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/insert_all.rb>
- Capability predicates and `#collector`: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/connection_adapters/abstract_adapter.rb>
- `to_sql_and_binds`: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/connection_adapters/abstract/database_statements.rb>
- `build_insert_sql` per adapter: `.../postgresql_adapter.rb`, `.../abstract_mysql_adapter.rb`, `.../sqlite3_adapter.rb`
- Pessimistic locking: <https://github.com/rails/rails/blob/main/activerecord/lib/active_record/locking/pessimistic.rb>

**Docs and proposals**
- Query interface guide: <https://guides.rubyonrails.org/active_record_querying.html>
- `Relation` API (insert_all/upsert_all live here since 7.2): <https://api.rubyonrails.org/classes/ActiveRecord/Relation.html>
- Conditional upsert proposal (open, not shipped): <https://github.com/rails/rails/pull/56981>

**Local**
- `~/dev/hey_record` 0.3.0: `dataset.hey`, `sql.hey`, `dialect.hey`, `model.hey`, `docs/DESIGN.md`, `todos.md`
- `~/dev/hey_sqlite3` 0.3.4: `adapter.hey` (`capabilities()`, connection record), `specs/returning_spec.hey`
- `~/dev/hey_mysql` 0.3.1: `adapter.hey` (`hey_mysql_interpolate_value`, `capabilities()`)
- `~/dev/hey_postgres`: `PACKAGE_SPEC.md`
- `~/dev/MMeow`: `src/db/statements.hey`, `src/db/sqlite_dialect.hey`, and the vendored
  `hey_record@0.4.1` `pg.hey` / `dialect.hey`
- Hey language reference: `~/dev/hey-lang-tgz/docs/developers/13-language-reference.md`

## 13. Flagged as unverified

1. **MySQL `SKIP LOCKED` / `NOWAIT` version floors** (§7) were not checked against a primary MySQL
   source, nor was MariaDB's position. Confirm before implementing `lock_modes` for the MySQL
   dialect.
2. **`Arel::Visitors::UnsupportedVisitError`** is *not* the unknown-node error; unknown nodes raise
   `TypeError, "Cannot visit #{object.class}"` from `Visitor#visit`. `UnsupportedVisitError` lives
   in `to_sql.rb` and fires only for the fourteen explicitly-aliased raw Ruby classes. Both are
   quoted above; the distinction matters if anyone reads this against older Arel documentation.
3. **`ToSql#quoted(o, a)` no longer exists** in current Rails (it was in the standalone `arel-9.0.0`
   gem). The only quoting hook is `ToSql#quote(value)` delegating to the adapter. Any design that
   assumes a per-visitor `quoted` hook is working from a stale mental model.
4. **No adapter overrides `def collector`**, including PostgreSQL. There is no PostgreSQL-specific
   `BindCollector` class anywhere in Arel or ActiveRecord; PG's entire contribution to bind
   placeholders is `BIND_BLOCK` plus `#arel_visitor`.
5. **`upsert_all(..., where:)` does not exist** in Rails main, 8.1, 8.0, 7.2, 7.1, 7.0, 6.1 or 6.0.
   The conditional-`DO UPDATE` feature is unmerged PR #56981.
6. **Rails does not render `ON CONSTRAINT name`.** `unique_by:` accepts an index name but resolves
   it to columns via the schema cache. If a design assumes constraint-name targeting is available in
   Rails, it is not.
7. **The Hey builtin-name list** used for the §10 stage-0 audit was not obtained; the collision risk
   is documented from `todos.md` item 2 (`HeyRecord.first`) and inferred, not enumerated. Get the
   authoritative list before naming the new functions.
8. **Hey's `set` semantics.** `docs/developers/13-language-reference.md` says `set` is "a statement
   for actor/monitor/supervisor state slots only", but `hey_record`'s and MMeow's shipped code use
   `set` freely inside ordinary functions. The collector threading proposed in §3.2 avoids the
   question entirely (every emit returns a new collector), but the discrepancy should be resolved
   before writing new code that depends on either reading.
9. **`allow_unsafe_raw_sql` and `enforce_raw_sql_allowlist` do not exist in current Rails.** The
   method is `disallow_raw_sql!` in `Sanitization::ClassMethods`; the opt-out was removed after 6.1
   and the check is now unconditional. The removal claim rests on greps of `active_record.rb`,
   `core.rb` and `guides/source/configuring.md` rather than a repo-wide content search, so a stray
   reference in a test or a deprecation shim is possible though unlikely.
10. **`COUNT(DISTINCT a, b)` on PostgreSQL.** It is verified that Rails routes multi-column distinct
    counts through `build_count_subquery` and that the predicate has no adapter conditional; it was
    **not** confirmed by executing the emitted SQL against a real PostgreSQL server. The design
    recommendation in §6 (always rewrite, never per-dialect flag) does not depend on the answer, but
    the parenthetical claim that PostgreSQL rejects the un-rewritten form does.
11. **Rails does not validate `having` without `group`** -- verified absent, so §4.2's refusal is a
    deliberate divergence rather than a copy. If it turns out to break a legitimate use (a `HAVING`
    over an implicit single group), it is the one proposed refusal in this document with no upstream
    precedent.
