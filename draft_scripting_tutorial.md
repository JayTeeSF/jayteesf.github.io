# Great command-line scripting with Hey

This guide uses `generate-packages-index.hey` as a concrete example. It is based on the uploaded Hey `0.99.346a` source tree and focuses on the current, verified language and standard-library surface.

## 1. The shape of a good Hey script

A maintainable Hey command-line script normally has five layers:

1. A shebang that selects the intended Hey installation.
2. Explicit standard-library imports.
3. An `UpperCamelCase` module that owns the script's behavior.
4. A small public entry function such as `PackagesIndex.run(args)`.
5. A tiny `program` block that passes `cli.args()` into the module.

```hey
#!/Users/jthomas/dev/hey-lang-tgz/bin/hey

import 'stdlib:cli'
import 'stdlib:files'

module PackagesIndex
  fn run(args)
    # command behavior
  end
end

program
  PackagesIndex.run(cli.args())
end
```

This gives the same organizational benefit as a Ruby service class without constructing an object whose only purpose is namespacing.

Ruby baseline:

```ruby
class PackagesIndex
  def initialize(packages_dir)
    @packages_dir = Pathname(packages_dir)
  end

  def generate
    # ...
  end
end
```

Hey equivalent:

```hey
module PackagesIndex
  fn run(args)
    # Values are passed explicitly.
  end
end
```

The Hey version makes dependencies visible at call sites and keeps helpers under one namespace:

```hey
PackagesIndex.render_package(task)
PackagesIndex.compare_paths(left, right)
PackagesIndex.run(cli.args())
```

## 2. Command-line arguments and help

`cli.args()` returns the application arguments. `cli.positionals(args)` removes recognized option/value pairs from the positional list, while `cli.flag?`, `cli.flag_int`, and `cli.missing_value?` support readable option handling.

```hey
let args = cli.args()

if cli.flag?(args, 'help') or cli.flag?(args, 'h')
  PackagesIndex.usage()
  return
end

if cli.missing_value?(args, 'workers')
  fail '--workers requires an integer value'
end

let paths = cli.positionals(args)
let workers = cli.flag_int(args, 'workers', cpu_count())
```

Use a raw squiggly heredoc for help text. The quoted terminator prevents interpolation, and `<<~` removes common indentation.

```hey
private fn usage_text()
  return <<~'USAGE'
    Usage: ./tool.hey [OPTIONS] [DIRECTORY]

    Options:
      --workers N   Number of parallel workers
      -h, --help    Show help
  USAGE
end
```

This is clearer than a long string containing escaped `\n` sequences.

## 3. Filesystem discovery

The current `stdlib:files` module owns traversal, metadata, path manipulation, and publication.

```hey
let packages = files.entries('./packages')
let all_files = files.files('./packages/hey_web', '')
let markdown = files.files('./packages/hey_web', '.md')
```

Important details:

- `files.entries(path)` returns sorted immediate children.
- `files.files(root, suffix)` uses the runtime recursive walker.
- An empty suffix, `files.files(root, '')`, returns every regular file below the root.
- `files.directory?`, `files.file?`, and `files.metadata` provide filesystem checks.
- `files.write_atomic(path, content)` publishes through a synchronized sibling temporary file and rename.

For this index generator, one recursive scan per package is better than scanning the same tree once for `.md`, again for `.html`, again for `.json`, and so on:

```hey
let package_files = files.files(package_dir, '')
let docs_dirs = PackagesIndex.docs_directories(package_dir, package_files)
let linkable_files = PackagesIndex.linkable_files(package_files)
```

## 4. Immutable collection style

Hey arrays are ordinary immutable values. Build a new array with spread syntax:

```hey
let links = []

for path in paths
  set links = [...links, PackagesIndex.file_link(path)]
end
```

After importing `stdlib:collections`, receiver-oriented collection helpers are available:

```hey
let sorted = paths
  .uniq
  .sort(PackagesIndex.compare_paths)
```

This lowers to normal module calls. It is not mutation or prototype patching.

The comparator remains a first-class module function:

```hey
fn compare_paths(left, right)
  return collections.compare(left, right)
end
```

The final script goes further and implements natural numeric ordering so `0.2.10` sorts after `0.2.2`, unlike plain lexical ordering.

## 5. Rendering with heredocs

Heredocs are the right default for complete HTML sections:

```hey
return <<~HTML
  <section class="package">
    <h2>#{PackagesIndex.html_escape(package_name)}</h2>
  #{text.indent(docs_html, '  ')}
  #{text.indent(files_html, '  ')}
  </section>
HTML
```

Use `%qq(...)` for a compact interpolated fragment that contains both quote styles:

```hey
return %qq(<li><a href="#{href}">#{label}</a></li>)
```

Use `text.join` and `text.indent` to compose arrays of rendered fragments without manual `"\n"` concatenation throughout the renderer:

```hey
let links_html = text.indent(text.join(links, "\n"), '  ')

return <<~HTML
  <ul>
  #{links_html}
  </ul>
HTML
```

## 6. Escape at the boundary

Structured path data should remain ordinary strings until rendering. Escape only when crossing into HTML or a URL attribute.

```hey
private fn html_escape(value)
  let escaped = text.replace_all(value, '&', '&amp;')
  set escaped = text.replace_all(escaped, '<', '&lt;')
  set escaped = text.replace_all(escaped, '>', '&gt;')
  set escaped = text.replace_all(escaped, '"', '&quot;')
  set escaped = text.replace_all(escaped, "'", '&#39;')
  return escaped
end
```

The URL path helper first protects existing percent signs, then encodes characters that would change URL meaning. The result is HTML-escaped when inserted into `href`.

## 7. Parallel work without manual threads

The work unit is one package. Each package can be scanned and rendered independently, so it is a good parallel boundary.

```hey
let sections = tasks
  .map(PackagesIndex.render_package, workers: workers)
  .collect()
```

This uses `stdlib:streams`. Parallel stream stages are backed by bounded runtime-managed Jobs and preserve input order by default. That means packages can finish in any order internally while the generated page remains deterministically sorted.

The final script chooses:

```hey
min(cpu_count(), package_count, 16)
```

It also takes a direct sequential path when the selected worker count is one, avoiding worker-pool overhead for tiny trees or deterministic debugging:

```hey
if workers == 1
  for task in tasks
    set sections = [...sections, PackagesIndex.render_package(task)]
  end
else
  set sections = tasks
    .map(PackagesIndex.render_package, workers: workers)
    .collect()
end
```

Parallelism is not automatically faster for seven tiny packages; filesystem cache state and scheduler setup can dominate. It becomes more useful as package count and documentation trees grow. `--workers 1` remains the straightforward baseline.

## 8. Atomic output

Do not truncate the live index before the replacement is ready:

```hey
files.write_atomic(output_path, html)
```

This is stronger than a direct write. Readers either see the previous complete index or the newly generated complete index.

## 9. A minimal build-up version

A deliberately small version can be written as:

```hey
#!/Users/jthomas/dev/hey-lang-tgz/bin/hey

import 'stdlib:cli'
import 'stdlib:files'
import 'stdlib:text'

module SimplePackagesIndex
  fn run(args)
    let paths = cli.positionals(args)
    let root = './packages'
    if paths.length == 1
      set root = paths[0]
    end

    let links = []
    for path in files.files(root, '.md')
      let relative = text.strip_prefix(path, root + '/')
      set links = [...links, %qq(<li><a href="#{relative}">#{relative}</a></li>)]
    end

    let html = <<~HTML
      <!doctype html>
      <html lang="en">
      <body>
        <h1>Packages</h1>
        <ul>
      #{text.indent(text.join(links, "\n"), '    ')}
        </ul>
      </body>
      </html>
    HTML

    files.write_atomic(files.join(root, 'index.html'), html)
  end
end

program
  SimplePackagesIndex.run(cli.args())
end
```

That version teaches the basic shape, but the complete script adds:

- validation and `--help`;
- `.md` and `.html` links;
- versioned `docs/` directory links, including empty directories;
- HTML and URL escaping;
- natural numeric sorting;
- package-level bounded parallelism;
- a sequential fast path;
- deterministic ordered output;
- a more polished static page.

## 10. Verification workflow

Run the script directly through its shebang:

```sh
chmod +x ./generate-packages-index.hey
./generate-packages-index.hey --help
./generate-packages-index.hey ./packages
```

Force the sequential baseline:

```sh
./generate-packages-index.hey --workers 1 ./packages
```

Check the generated page and links:

```sh
test -s ./packages/index.html
grep -n 'docs/' ./packages/index.html
grep -nE '\.(md|html)</a>' ./packages/index.html
```

From a Hey source checkout, syntax-check the script with:

```sh
./bin/heyc ./generate-packages-index.hey --check
```

The supplied final script was checked with the uploaded `0.99.346a` compiler, built through its native-C verification backend, and run against fixtures containing normal documentation, nested documentation, multiple versions, natural-sort cases such as `0.2.2`/`0.2.10`, and an empty versioned `docs/` directory.
