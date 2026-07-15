(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HeyBrowser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = 'hey-browser-js-0.1';
  const EXIT = Symbol('hey-exit');

  function splitLines(source) {
    return String(source || '').replace(/\r\n?/g, '\n').split('\n');
  }

  function stripComment(line) {
    let quote = '';
    let escaped = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (quote) {
        if (ch === quote) quote = '';
        continue;
      }
      if (ch === "'" || ch === '"') { quote = ch; continue; }
      if (ch === '#') return line.slice(0, i);
    }
    return line;
  }

  function stripSpecsAndImports(source) {
    const lines = splitLines(source);
    const out = [];
    let skippingSpec = false;
    let specDepth = 0;
    for (const raw of lines) {
      const line = stripComment(raw).trimEnd();
      const trimmed = line.trim();
      if (!skippingSpec && /^spec\s+/.test(trimmed)) {
        skippingSpec = true;
        specDepth = 1;
        continue;
      }
      if (skippingSpec) {
        if (/^(if|for|while|fn|actor|worker|program|spec)\b/.test(trimmed)) specDepth += 1;
        if (trimmed === 'end') {
          specDepth -= 1;
          if (specDepth === 0) skippingSpec = false;
        }
        continue;
      }
      if (/^import\s+/.test(trimmed)) continue;
      out.push(line);
    }
    return out;
  }

  function balanceDelta(text) {
    let delta = 0;
    let quote = '';
    let escaped = false;
    for (const ch of text) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (quote) {
        if (ch === quote) quote = '';
        continue;
      }
      if (ch === "'" || ch === '"') { quote = ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') delta += 1;
      if (ch === ')' || ch === ']' || ch === '}') delta -= 1;
    }
    return delta;
  }

  function logicalLines(source) {
    const raw = stripSpecsAndImports(source);
    const out = [];
    let current = '';
    let balance = 0;
    for (const original of raw) {
      const trimmed = original.trim();
      if (!trimmed) continue;
      if (!current) {
        current = trimmed;
        balance = balanceDelta(trimmed);
        continue;
      }
      if (balance > 0 || trimmed.startsWith('.')) {
        current += trimmed.startsWith('.') ? trimmed : ` ${trimmed}`;
        balance += balanceDelta(trimmed);
        continue;
      }
      out.push(current);
      current = trimmed;
      balance = balanceDelta(trimmed);
    }
    if (current) out.push(current);
    return out;
  }

  function parseHeader(line, keyword) {
    const match = line.match(new RegExp(`^${keyword}\\s+([A-Za-z_][A-Za-z0-9_?]*)\\s*\\((.*)\\)$`));
    if (!match) throw new Error(`invalid ${keyword} declaration: ${line}`);
    return { name: match[1], params: match[2].trim() ? splitTopLevel(match[2], ',').map((v) => v.trim()) : [] };
  }

  function splitTopLevel(text, delimiter) {
    const out = [];
    let start = 0;
    let depth = 0;
    let quote = '';
    let escaped = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (quote) {
        if (ch === quote) quote = '';
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') depth += 1;
      else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
      else if (ch === delimiter && depth === 0) {
        out.push(text.slice(start, i));
        start = i + 1;
      }
    }
    out.push(text.slice(start));
    return out;
  }

  function collectBlock(lines, start) {
    const body = [];
    let depth = 1;
    for (let i = start; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^(if|for|while)\b/.test(line)) depth += 1;
      if (line === 'end') {
        depth -= 1;
        if (depth === 0) return { body, next: i + 1 };
      }
      body.push(line);
    }
    throw new Error('unterminated block');
  }

  function parseProgram(source) {
    const lines = logicalLines(source);
    const declarations = [];
    let program = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^fn\s+/.test(line)) {
        const header = parseHeader(line, 'fn');
        const block = collectBlock(lines, i + 1);
        declarations.push({ kind: 'fn', ...header, body: block.body });
        i = block.next;
        continue;
      }
      if (/^actor\s+/.test(line)) {
        const header = parseHeader(line, 'actor');
        const block = collectBlock(lines, i + 1);
        declarations.push({ kind: 'actor', ...header, body: block.body });
        i = block.next;
        continue;
      }
      if (/^worker\s+/.test(line)) {
        const header = parseHeader(line, 'worker');
        const block = collectBlock(lines, i + 1);
        declarations.push({ kind: 'worker', ...header, body: block.body });
        i = block.next;
        continue;
      }
      if (line === 'program') {
        const block = collectBlock(lines, i + 1);
        program = block.body;
        i = block.next;
        continue;
      }
      throw new Error(`unsupported top-level form: ${line}`);
    }
    return { declarations, program };
  }

  function mangle(name) {
    return String(name).replace(/\?$/g, '__question');
  }

  function transformInterpolatedStrings(expr) {
    let out = '';
    for (let i = 0; i < expr.length; i += 1) {
      const ch = expr[i];
      if (ch !== '"') { out += ch; continue; }
      let value = '';
      let escaped = false;
      let j = i + 1;
      for (; j < expr.length; j += 1) {
        const inner = expr[j];
        if (escaped) { value += `\\${inner}`; escaped = false; continue; }
        if (inner === '\\') { escaped = true; continue; }
        if (inner === '"') break;
        value += inner;
      }
      if (j >= expr.length) throw new Error('unterminated string literal');
      const decoded = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      if (decoded.includes('#{')) {
        const template = decoded.replace(/`/g, '\\`').replace(/#\{([^}]+)\}/g, (_, inner) => `\${${transformExpression(inner)}}`);
        out += `\`${template}\``;
      } else {
        out += JSON.stringify(decoded);
      }
      i = j;
    }
    return out;
  }

  function transformNamedCall(expr, name) {
    const needle = `${name}(`;
    let start = expr.indexOf(needle);
    while (start >= 0) {
      const open = start + needle.length - 1;
      let depth = 0;
      let quote = '';
      let escaped = false;
      let close = -1;
      for (let i = open; i < expr.length; i += 1) {
        const ch = expr[i];
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (quote) { if (ch === quote) quote = ''; continue; }
        if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
        if (ch === '(') depth += 1;
        if (ch === ')') {
          depth -= 1;
          if (depth === 0) { close = i; break; }
        }
      }
      if (close < 0) return expr;
      const args = splitTopLevel(expr.slice(open + 1, close), ',').map((v) => v.trim()).filter(Boolean);
      const namedAt = args.findIndex((v) => /^[A-Za-z_][A-Za-z0-9_]*\s*:/.test(v));
      if (namedAt >= 0) {
        const positional = args.slice(0, namedAt);
        const named = args.slice(namedAt).map((v) => {
          const colon = v.indexOf(':');
          return `${v.slice(0, colon).trim()}: ${transformExpression(v.slice(colon + 1).trim())}`;
        });
        const replacement = `${name}(${positional.map(transformExpression).join(', ')}${positional.length ? ', ' : ''}{${named.join(', ')}})`;
        expr = expr.slice(0, start) + replacement + expr.slice(close + 1);
        start = expr.indexOf(needle, start + replacement.length);
      } else {
        start = expr.indexOf(needle, close + 1);
      }
    }
    return expr;
  }

  function transformStream(expr) {
    if (!/\.collect\s*\(\s*\)/.test(expr) || !/\.(map|filter)\s*\(/.test(expr)) return expr;
    const firstMethod = expr.search(/\.(map|filter)\s*\(/);
    if (firstMethod < 0) return expr;
    const base = expr.slice(0, firstMethod);
    const rest = expr.slice(firstMethod);
    return `await runtime.stream(${base})${rest}`;
  }

  function transformExpression(input) {
    let expr = transformInterpolatedStrings(String(input).trim());
    expr = expr.replace(/\bnil\b/g, 'null').replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\s+/g, '!');
    expr = expr.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\?(?=\s*\()/g, (_, name) => `${name}__question`);
    expr = expr.replace(/([A-Za-z_][A-Za-z0-9_.\[\]]*)\.to_json\b/g, 'runtime.toJson($1)');
    expr = expr.replace(/\bspawn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^()]*)\)/g, 'runtime.spawn($1($2))');
    expr = transformNamedCall(expr, 'workers');
    expr = transformNamedCall(expr, 'jobs.define');
    expr = transformNamedCall(expr, '.map');
    expr = transformNamedCall(expr, '.filter');
    expr = expr.replace(/\bworkers\s*\(/g, 'runtime.workers(');
    expr = expr.replace(/\bjobs\.define\s*\(/g, 'runtime.jobs.define(');
    expr = expr.replace(/\bjobs\.result\s*\(/g, 'await runtime.jobs.result(');
    expr = expr.replace(/\bweb\./g, 'runtime.web.');
    expr = expr.replace(/\bfiles\./g, 'runtime.files.');
    expr = expr.replace(/\bbytes\./g, 'runtime.bytes.');
    expr = expr.replace(/\bjoin\s*\(/g, 'runtime.joinValues(');
    expr = transformStream(expr);
    return expr;
  }

  function compileStatements(lines, context) {
    let out = '';
    let i = 0;
    function emit(line) { out += `${'  '.repeat(context.indent)}${line}\n`; }
    while (i < lines.length) {
      const line = lines[i];
      if (line === 'end' || line === 'else') return { code: out, next: i, stop: line };
      let match;
      if ((match = line.match(/^let\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/))) {
        emit(`let ${mangle(match[1])} = ${transformExpression(match[2])};`);
        i += 1; continue;
      }
      if ((match = line.match(/^set\s+([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(.+)$/))) {
        const name = mangle(match[1]);
        emit(`${name} = ${transformExpression(match[2])};`);
        if (context.stateNames && context.stateNames.has(name)) emit(`__actor.state.${name} = ${name};`);
        i += 1; continue;
      }
      if ((match = line.match(/^says\s+(.+)$/))) { emit(`runtime.say(${transformExpression(match[1])});`); i += 1; continue; }
      if ((match = line.match(/^print\s+(.+)$/))) { emit(`runtime.print(${transformExpression(match[1])});`); i += 1; continue; }
      if ((match = line.match(/^warn\s+(.+)$/))) { emit(`runtime.warn(${transformExpression(match[1])});`); i += 1; continue; }
      if ((match = line.match(/^return(?:\s+(.+))?$/))) { emit(`return ${match[1] ? transformExpression(match[1]) : 'null'};`); i += 1; continue; }
      if ((match = line.match(/^fail\s+(.+)$/))) { emit(`throw new Error(String(${transformExpression(match[1])}));`); i += 1; continue; }
      if ((match = line.match(/^send\s+(.+?),\s*(.+)$/))) { emit(`runtime.send(${transformExpression(match[1])}, ${transformExpression(match[2])});`); i += 1; continue; }
      if ((match = line.match(/^join\s+(.+)$/))) { emit(`await runtime.join(${transformExpression(match[1])});`); i += 1; continue; }
      if (line === 'exit') { emit('return runtime.EXIT;'); i += 1; continue; }
      if ((match = line.match(/^if\s+(.+)$/))) {
        emit(`if (${transformExpression(match[1])}) {`);
        const nested = compileStatements(lines.slice(i + 1), {...context, indent: context.indent + 1});
        out += nested.code;
        i += nested.next + 1;
        if (lines[i] === 'else') {
          emit('} else {');
          const alternate = compileStatements(lines.slice(i + 1), {...context, indent: context.indent + 1});
          out += alternate.code;
          i += alternate.next + 1;
        }
        emit('}');
        if (lines[i] === 'end') i += 1;
        continue;
      }
      if ((match = line.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+)$/))) {
        emit(`for (const ${mangle(match[1])} of ${transformExpression(match[2])}) {`);
        const nested = compileStatements(lines.slice(i + 1), {...context, indent: context.indent + 1});
        out += nested.code;
        i += nested.next + 1;
        emit('}');
        if (lines[i] === 'end') i += 1;
        continue;
      }
      if ((match = line.match(/^while\s+(.+)$/))) {
        emit(`while (${transformExpression(match[1])}) {`);
        const nested = compileStatements(lines.slice(i + 1), {...context, indent: context.indent + 1});
        out += nested.code;
        i += nested.next + 1;
        emit('}');
        if (lines[i] === 'end') i += 1;
        continue;
      }
      if (/^(state|receive)\b/.test(line)) { i += 1; continue; }
      emit(`${transformExpression(line)};`);
      i += 1;
    }
    return { code: out, next: i, stop: '' };
  }

  function compileFunction(decl) {
    const params = decl.params.map(mangle).join(', ');
    const body = compileStatements(decl.body, { indent: 1, stateNames: null }).code;
    return `function ${mangle(decl.name)}(${params}) {\n${body}}\n`;
  }

  function compileWorker(decl) {
    const params = decl.params.map(mangle).join(', ');
    const body = compileStatements(decl.body, { indent: 1, stateNames: null }).code;
    return `async function ${mangle(decl.name)}(${params}) {\n${body}}\n`;
  }

  function compileActor(decl) {
    const states = [];
    let messageName = 'message';
    const body = [];
    for (const line of decl.body) {
      let match;
      if ((match = line.match(/^state\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/))) {
        states.push({ name: mangle(match[1]), value: transformExpression(match[2]) });
      } else if ((match = line.match(/^receive\s+([A-Za-z_][A-Za-z0-9_]*)$/))) {
        messageName = mangle(match[1]);
      } else {
        body.push(line);
      }
    }
    const params = decl.params.map(mangle);
    const stateObject = `{${states.map((s) => `${s.name}: ${s.value}`).join(', ')}}`;
    const stateLoads = states.map((s) => `    let ${s.name} = __actor.state.${s.name};`).join('\n');
    const compiled = compileStatements(body, { indent: 2, stateNames: new Set(states.map((s) => s.name)) }).code;
    return `function ${mangle(decl.name)}(${params.join(', ')}) {\n  return runtime.actorDefinition(async (__actor, ${messageName}) => {\n${stateLoads}${stateLoads ? '\n' : ''}${compiled}  }, ${stateObject});\n}\n`;
  }

  function transpile(source) {
    const ast = parseProgram(source);
    let code = `'use strict';\n`;
    for (const decl of ast.declarations) {
      if (decl.kind === 'fn') code += compileFunction(decl);
      else if (decl.kind === 'worker') code += compileWorker(decl);
      else if (decl.kind === 'actor') code += compileActor(decl);
    }
    code += compileStatements(ast.program, { indent: 0, stateNames: null }).code;
    return { ok: true, version: VERSION, javascript: code };
  }

  function createRuntime(writeStdout, writeStderr) {
    const virtualFiles = new Map();
    const actors = new Set();
    const render = (value) => {
      if (value === null || value === undefined) return 'nil';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (Array.isArray(value) || (typeof value === 'object' && value && value.constructor === Object)) return JSON.stringify(value);
      return String(value);
    };
    const runtime = {
      EXIT,
      say(value) { writeStdout(`${render(value)}\n`); },
      print(value) { writeStdout(render(value)); },
      warn(value) { writeStderr(`${render(value)}\n`); },
      toJson(value) { return JSON.stringify(value); },
      joinValues(values, separator) { return values.join(separator); },
      actorDefinition(handler, initialState) { return { __heyActorDefinition: true, handler, initialState }; },
      spawn(definition) {
        if (!definition || !definition.__heyActorDefinition) throw new Error('spawn expects an actor definition');
        const actor = {
          state: structuredClone(definition.initialState || {}), queue: [], running: false, stopped: false,
          waiters: [], handler: definition.handler,
        };
        actors.add(actor);
        return actor;
      },
      send(actor, message) {
        if (!actor || actor.stopped) return false;
        actor.queue.push(message);
        runtime.drainActor(actor);
        return true;
      },
      async drainActor(actor) {
        if (actor.running) return;
        actor.running = true;
        while (actor.queue.length && !actor.stopped) {
          const message = actor.queue.shift();
          const result = await actor.handler(actor, message);
          if (result === EXIT) actor.stopped = true;
        }
        actor.running = false;
        if (actor.stopped) {
          actors.delete(actor);
          actor.waiters.splice(0).forEach((resolve) => resolve());
        }
      },
      async join(actor) {
        if (!actor || actor.stopped) return;
        await new Promise((resolve) => actor.waiters.push(resolve));
      },
      workers(worker, options) {
        const opts = options || {};
        let completed = 0;
        let pending = 0;
        let stopped = false;
        const capacity = Number(opts.capacity || 64);
        return {
          enqueue(message) {
            if (stopped || pending >= capacity) return false;
            pending += 1;
            Promise.resolve().then(async () => {
              try { await worker(message); }
              finally { pending -= 1; completed += 1; }
            });
            return true;
          },
          status() { return { completed, pending, workers: Number(opts.count || 1) }; },
          stop() { stopped = true; return { ok: true, completed }; },
        };
      },
      jobs: {
        define(name, worker, options) {
          const opts = options || {};
          let completed = 0;
          let stopped = false;
          let nextId = 1;
          return {
            name,
            enqueue(payload) {
              if (stopped) return { accepted: false, id: 0, error: 'stopped' };
              const receipt = { accepted: true, id: nextId++ };
              receipt.promise = Promise.resolve().then(async () => {
                try {
                  const value = await worker(payload);
                  completed += 1;
                  return { ok: true, value };
                } catch (error) {
                  return { ok: false, error: error.message };
                }
              });
              return receipt;
            },
            status() { return { completed, workers: Number(opts.count || 1) }; },
            stop() { stopped = true; return { ok: true }; },
          };
        },
        async result(job, receipt) {
          if (!receipt || !receipt.accepted) return { ok: false, error: receipt && receipt.error || 'rejected' };
          return receipt.promise;
        },
      },
      stream(values) {
        let promise = Promise.resolve(Array.from(values));
        const chain = {
          map(fn) { promise = promise.then((items) => Promise.all(items.map((item) => fn(item)))); return chain; },
          filter(fn) { promise = promise.then(async (items) => { const keep = await Promise.all(items.map((item) => fn(item))); return items.filter((_, i) => keep[i]); }); return chain; },
          each(fn) { promise = promise.then(async (items) => { await Promise.all(items.map((item) => fn(item))); return items; }); return chain; },
          collect() { return promise; },
        };
        return chain;
      },
      files: {
        open(path, mode) {
          let closed = false;
          let position = 0;
          if (mode === 'write') virtualFiles.set(path, '');
          const handle = {
            write_all(value) { if (closed) return { ok: false, error: 'closed' }; virtualFiles.set(path, String(value)); position = String(value).length; return { ok: true }; },
            read_line(limit) {
              if (closed) return { ok: false, error: 'closed' };
              const data = virtualFiles.get(path) || '';
              const newline = data.indexOf('\n', position);
              const end = Math.min(newline >= 0 ? newline : data.length, position + Number(limit || data.length));
              const slice = data.slice(position, end);
              position = newline >= 0 && end === newline ? newline + 1 : end;
              return { ok: true, value: { data: new TextEncoder().encode(slice) } };
            },
            close() { closed = true; return { ok: true }; },
          };
          return { ok: true, value: handle };
        },
      },
      bytes: { decode(data) { return new TextDecoder().decode(data); } },
      web: {
        text(body) { return { status: 200, headers: {'content-type': 'text/plain'}, body: String(body) }; },
        json(value) { return { status: 200, headers: {'content-type': 'application/json'}, body: JSON.stringify(value) }; },
        get(path, handler) { return { method: 'GET', path, handler }; },
        routes(routes) { return routes; },
        dispatch(routes, request) {
          for (const route of routes) {
            if (route.method !== request.method) continue;
            const routeParts = route.path.split('/').filter(Boolean);
            const pathParts = request.path.split('/').filter(Boolean);
            if (routeParts.length !== pathParts.length) continue;
            const params = {};
            let matched = true;
            routeParts.forEach((part, i) => { if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(pathParts[i]); else if (part !== pathParts[i]) matched = false; });
            if (matched) return route.handler({...request, params});
          }
          return { status: 404, headers: {}, body: 'Not found' };
        },
      },
    };
    return runtime;
  }

  async function executeLocal(source) {
    const stdout = [];
    const stderr = [];
    const started = Date.now();
    try {
      const compiled = transpile(source);
      const runtime = createRuntime((value) => stdout.push(value), (value) => stderr.push(value));
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction('runtime', compiled.javascript);
      await fn(runtime);
      await Promise.resolve();
      return { ok: true, phase: 'run', stdout: stdout.join(''), stderr: stderr.join(''), elapsed_ms: Date.now() - started, javascript: compiled.javascript, diagnostics: [] };
    } catch (error) {
      return { ok: false, phase: 'transpile', stdout: stdout.join(''), stderr: stderr.join(''), elapsed_ms: Date.now() - started, diagnostics: [{ phase: 'browser-js', message: error.message }] };
    }
  }

  function execute(source, options) {
    const opts = options || {};
    const timeoutMs = Number(opts.timeoutMs || 2500);
    const workerUrl = opts.workerUrl || 'assets/hey-browser.js';
    if (typeof Worker === 'undefined') return executeLocal(source);
    return new Promise((resolve) => {
      const worker = new Worker(workerUrl);
      const timer = setTimeout(() => {
        worker.terminate();
        resolve({ ok: false, phase: 'run', stdout: '', stderr: '', elapsed_ms: timeoutMs, diagnostics: [{phase: 'runtime', message: `execution exceeded ${timeoutMs} ms`}] });
      }, timeoutMs);
      worker.onmessage = (event) => { clearTimeout(timer); worker.terminate(); resolve(event.data); };
      worker.onerror = (event) => { clearTimeout(timer); worker.terminate(); resolve({ok: false, phase: 'browser-js', stdout: '', stderr: '', elapsed_ms: 0, diagnostics: [{phase: 'browser-js', message: event.message}]}); };
      worker.postMessage({source});
    });
  }

  if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope) {
    self.onmessage = async (event) => self.postMessage(await executeLocal(event.data && event.data.source || ''));
  }

  return { VERSION, transpile, execute, executeLocal };
});
